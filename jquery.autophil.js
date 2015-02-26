/**
 * autophil v1.0.0 - the genesis of autofills
 * MIT Licensing
 * Copyright (c) 2015 Justin Rodermond
**/

;(function($, window, document, undefined) {

    var pluginName = "autophil";
    var defaults = {
            opts: [],
            maxSuggestions: 10,
            delim: '|',
            tabStopOnDelimiter: false,
            multiStringMatch: false
        };

    function Plugin(element, options) {
        var self = this;
        this.element = $(element);
        this.options = $.extend({}, defaults, options);
        this._defaults = defaults;
        this._name = pluginName;
        var privateVars = ['wrapper', 'originalInput', 'hiddenInput', 'dropDown', 'listItemTemplate', 'listItems',
                           'currentHover', 'topItem', 'fillItem', 'matchedIds', 'noMatches', 'partialText'];
        privateVars.forEach(function(v) {
            self[v] = null;
        });
        this.init();
    }

    Plugin.prototype = {

        init: function() {
            if (Object.prototype.toString.call(this.options.opts) !== '[object Array]') {
                console.warn('%cYou must initialize autophil with a valid Array.', 'color: #00f;');
                return false;
            } else {
                this.options.opts = this.options.opts.sort().map(function(str) { return str.toLowerCase(); });
            }

            // multiStringMatch setting overrides tabStopOnDelimeter
            if (this.options.multiStringMatch) this.options.tabStopOnDelimiter = false;

            this.destroy();
            this.createElements();
            this.createListItems();
            this.bindEvents();
        },

        createListItems: function() {
            this.dropDown.empty();

            for (var i = 0; i < this.options.opts.length; i++) {
                var li = this.listItemTemplate.clone();
                li.text(this.options.opts[i]).attr('data-option', i);
                li.appendTo(this.dropDown);
            }

            this.listItems = this.dropDown.find('li');
        },

        createElements: function() {
            var previousElement = this.element.prev();
            var parentElement = this.element.parent();

            this.wrapper = $('<div class="ap-wrapper"></div>');
            this.wrapper.addClass(this.element.attr('class'));
            this.wrapper.css({
                'height': this.element.css('height')
            });

            this.inheritStyles(this.element, this.wrapper, ['width', 'display']);

            this.hiddenInput = this.element.attr('autocomplete', 'off').clone();

            this.hiddenInput.attr({
                'name': this.element.attr('name') + '_hidden',
                'id': this.element.attr('id') + '_hidden'
            }).addClass('ap-hint');

            this.inheritStyles(this.element, this.hiddenInput, ['padding', 'letter-spacing', 'font-kerning', 'background-color']);

            this.dropDown = $('<ul class="ap-list"></ul>').css({
                'top': this.element.css('height'),
            });

            this.inheritStyles(this.element, this.dropDown, ['font-family', 'font-size', 'border-color']);

            this.element.css('background-color', 'transparent').addClass('ap-input');

            this.listItemTemplate = $('<li class="ap-listitem"></li>');

            this.listItemTemplate.css({
                'padding': '2px 0',
                'padding-left': this.element.css('padding-left')
            });

            this.createListItems();

            this.wrapper.append(this.element);
            this.wrapper.append(this.hiddenInput);
            this.wrapper.append(this.dropDown);

            // insert wrapper into DOM
            if (previousElement.length) {
                this.wrapper.insertAfter(previousElement);
            } else {
                this.wrapper.prependTo(parentElement);
            }

            // assume there was a linebreak or space in markup
            this.wrapper.before(' ');
        },

        inheritStyles: function(sourceEl, targetEl, stylesArray) {
            var stylesObject = {};
            for (var i = 0; i < stylesArray.length; i++) {
                var style = stylesArray[i];
                stylesObject[style] = sourceEl.css(style);
            }
            return targetEl.css(stylesObject);
        },

        bindEvents: function() {
            var self = this;
            this.element.on('keydown', $.proxy(this.keyDownHandler, this));
            this.element.on('keyup', $.proxy(this.keyUpHandler, this));
            this.element.on('blur', $.proxy(this.removeHint, this));

            this.dropDown.on('mouseover', 'li', function() {
                self.itemHover(parseInt($(this).attr('data-option')));
            });

            this.dropDown.on('click', 'li', function(e) {
                self.itemSelect(e, parseInt($(this).attr('data-option')));
            });

            this.keyDownHandler();
        },

        keyDownHandler: function(e) {
            e = e || window.event;
            var keyCode = e.keyCode;

            // TAB, ENTER, END, RIGHT --> select an item
            if (keyCode === 9 || keyCode === 13 || keyCode === 35 || keyCode === 39) {
                var choice = null;
                if (this.fillItem !== null) choice = this.fillItem;
                if (this.currentHover !== null) choice = this.currentHover;

                // if something is selected
                if (choice !== null) {
                    this.itemSelect({}, choice);
                    return false; // prevent form submit
                }
            }
        },

        keyUpHandler: function(e) {
            var self = this;
            e = e || {};
            var keyCode = e.keyCode;

            // TAB, ENTER, PAGE UP, PAGE DOWN, END, RIGHT --> do nothing
            if ([9, 13, 33, 34, 35, 39].indexOf(keyCode) !== -1) { return false; }

            // ESCAPE --> hide list and selected items
            if (keyCode === 27) {
                self.dropDown.hide();
                self.fillItem = null;
                self.currentHover = null;
                self.element.focus();
                return false;
            }

            self.processInputText();

            self.handleUpAndDownKeys(keyCode);

            self.fillItem = null;
            if (self.topItem !== null) self.fillItem = self.topItem;
            if (self.currentHover !== null) self.fillItem = self.currentHover;

            self.itemHover();
            self.updateHint(self.fillItem);
        },

        processInputText: function() {
            var self = this;
            this.partialText = this.element.val().trim();
            this.searchText = this.partialText.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
            
            // match multiple strings in search query (separated by space)
            if (this.options.multiStringMatch) {
                var searches = this.searchText.split(' ');

                // matches is an array of booleans
                var matches = this.options.opts.map(function(item) {
                    for (var i = 0; i < searches.length; i++) {
                        if (! new RegExp(searches[i]).test(item)) {
                            return false;
                        }
                    }
                    // return false for an exact match so it does not get suggested
                    return item !== self.partialText;
                });

            } else {
                // exact string match
                var regex = new RegExp('^' + this.searchText + '.+$');
                var matches = this.options.opts.map(function(item) { return regex.test(item); });
            }

            // create an array of the matched ids
            this.matchedIds = [];
            for (var i = 0; i < matches.length; i++) {
                if (matches[i]) {
                    this.matchedIds.push(i);
                }
            }

            // determine autophil and hover states
            var currentHoverIsInTheList = this.matchedIds.indexOf(this.currentHover) !== -1;
            this.noMatches = this.matchedIds.length === 0;
            this.topItem = this.noMatches ? null : this.matchedIds[0];
            this.currentHover = currentHoverIsInTheList ? this.currentHover : null;

            // toggle list elements
            this.dropDown.toggle(!this.noMatches && this.partialText.length > 0);
            if (!this.noMatches) {
                var num = 0;
                this.listItems.each(function(i, li) {
                    var $li = $(li);
                    // toggle row
                    if (matches[i] && ++num < self.options.maxSuggestions) {
                        $li.show();
                        if (self.options.multiStringMatch) {
                            $li.text(self.options.opts[i]);
                        } else {
                            $li.html(self.partialText + '<b>' + self.options.opts[i].substr(self.partialText.length) + '</b>');
                        }
                    } else {
                        $li.hide();
                    }
                });
            }
        },

        handleUpAndDownKeys: function(keyCode) {
            // UP
            if (keyCode === 38 && !this.noMatches) {
                var lastVisible = this.matchedIds[this.matchedIds.length - 1];
                var currIndex = this.matchedIds.indexOf(this.currentHover);
                this.currentHover = this.currentHover && this.currentHover > 0 ? this.matchedIds[currIndex - 1] : lastVisible;
                this.itemHover();
                this.element.get(0).setSelectionRange(this.partialText.length, this.partialText.length);
            }

            // DOWN
            if (keyCode === 40 && !this.noMatches) {
                // failed match (-1 + 1) will go to index 0
                this.currentHover = this.matchedIds[this.matchedIds.indexOf(this.currentHover) + 1];
                if (!this.currentHover) this.currentHover = 0;
                this.itemHover();
            }
        },

        itemHover: function(id) {
            this.currentHover = typeof id !== 'undefined' ? id : this.currentHover;
            this.listItems.removeClass('ap-hover');

            if (parseInt(this.currentHover) > -1) {
                this.listItems.eq(this.currentHover).addClass('ap-hover');
                this.updateHint(this.currentHover);
            }
        },

        updateHint: function(id) {
            this.hiddenInput.val(id !== null && !this.options.multiStringMatch ? this.options.opts[id] : '');
        },

        removeHint: function(e) {
            this.hiddenInput.val('');
        },

        itemSelect: function(e, id) {
            this.currentHover = null;
            this.itemFill = null;
            var fillText = this.listItems.eq(id).text();

            // select up to delimiter
            if (this.options.tabStopOnDelimiter && e.type !== 'click') {
                var remainingText = fillText.substr(this.partialText.length);
                var delimStart = remainingText.indexOf(this.options.delim);

                if (delimStart !== -1) {
                    fillText = fillText.substr(0, this.partialText.length) + remainingText.substr(0, delimStart) + this.options.delim + ' ';
                    this.partialText = fillText;
                    this.itemFill = id;
                }
            }

            this.itemHover();
            this.element.val(fillText);
            this.keyUpHandler(e);
        },
        
        destroy: function() {
            if (this.element.hasClass('ap-input')) {
                var oldWrapper = this.element.parent();
                var wrapperParent = oldWrapper.parent();
                var wrapperPrevious = oldWrapper.prev();

                if (wrapperPrevious.length) {
                    this.element.insertAfter(wrapperPrevious);
                } else {
                    this.element.prependTo(wrapperParent);
                }

                oldWrapper.remove();

                this.element.css({
                    'position': '',
                    'top': '',
                    'left': '',
                    'width': '',
                    'background-color': ''
                }).removeClass('ap-input').before(' ');
            }
        }
    };

    // https://github.com/jquery-boilerplate/jquery-patterns/blob/master/patterns/jquery.basic.plugin-boilerplate.js
    $.fn[pluginName] = function(options) {
        if (options === 'destroy' && $(this).data().hasOwnProperty(pluginName)) {
            console.warn('%cDestroyed autophil.', 'color: #00f;');
            $(this).data()[pluginName].destroy();
        }

        return this.each(function() {
            if (!$.data(this, pluginName)) {
                $.data(this, pluginName,
                new Plugin(this, options));
            }
        }).focus();
    };

})(jQuery, window, document);
