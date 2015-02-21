/**
 * autophil v1.0.0 - the genesis of autofills
 * MIT Licensing
 * Copyright (c) 2015 Justin Rodermond
 *
 * This is a simple, google-like autocomplete plugin. 
**/

// Call on an input element
// dataArray: an array of strings
;(function($, document, window, undefined) {

    $.fn.autophil = function(dataArray) {

        // options
        var options = [];
        var maxSuggestions = 10;

        // dom elements
        var wrapper;
        var originalInput;
        var hiddenInput;
        var dropDown;
        var listItemTemplate;
        var listItems;

        var currentHover;
        var topItem;
        var fillItem;
        var matchedIds;
        var noMatches;
        var partialText;

        return this.each(function() {
            init(this);
        });

        function init(input) {
            // exit if invalid Array
            if (Object.prototype.toString.call(dataArray) !== '[object Array]') {
                console.warn('%cYou must initialize autophil with a valid Array.', 'color: #00f;');
                return false;
            }

            options = dataArray.sort().map(function(str) { return str.toLowerCase(); });

            originalInput = $(input);
            $.fn.autophil.destroy(originalInput);
            
            createElements();
            createListItems();
            bindEvents();
        }

        function createListItems() {
            dropDown.empty();

            for (var i = 0; i < options.length; i++) {
                var li = listItemTemplate.clone();
                li.text(options[i]).attr('data-option', i);
                li.appendTo(dropDown);
            }

            listItems = dropDown.find('li');
        }

        function createElements() {
            var previousElement = originalInput.prev();
            var parentElement = originalInput.parent();

            wrapper = $('<div class="ap-wrapper"></div>');
            wrapper.addClass(originalInput.attr('class'));
            wrapper.css({
                'height': originalInput.css('height')
            });

            inheritStyles(originalInput, wrapper, ['width', 'display']);

            hiddenInput = originalInput.attr('autocomplete', 'off').clone();

            hiddenInput.attr({
                'name': originalInput.attr('name') + '_hidden',
                'id': originalInput.attr('id') + '_hidden'
            }).addClass('ap-hint');

            inheritStyles(originalInput, hiddenInput, ['padding', 'letter-spacing', 'font-kerning', 'background-color']);

            dropDown = $('<ul class="ap-list"></ul>').css({
                'top': originalInput.css('height'),
            });

            inheritStyles(originalInput, dropDown, ['font-family', 'font-size', 'border-color']);

            originalInput.css('background-color', 'transparent').addClass('ap-input');

            listItemTemplate = $('<li class="ap-listitem"></li>');

            listItemTemplate.css({
                'padding': '2px 0',
                'padding-left': originalInput.css('padding-left')
            });

            createListItems();

            wrapper.append(originalInput);
            wrapper.append(hiddenInput);
            wrapper.append(dropDown);

            // insert wrapper into DOM
            if (previousElement.length) {
                wrapper.insertAfter(previousElement);
            } else {
                wrapper.prependTo(parentElement);
            }

            wrapper.before(' ');
        }

        function inheritStyles(sourceEl, targetEl, stylesArray) {
            var stylesObject = {};
            for (var i = 0; i < stylesArray.length; i++) {
                var style = stylesArray[i];
                stylesObject[style] = sourceEl.css(style);
            }
            return targetEl.css(stylesObject);
        }

        function bindEvents() {
            originalInput.on('keydown', keyDownHandler);
            originalInput.on('keyup', keyUpHandler);
            originalInput.on('blur', removeHint);

            dropDown.on('mouseover', 'li', function() {
                itemHover(parseInt($(this).attr('data-option')));
            });

            dropDown.on('click', 'li', function(e) {
                itemSelect(e, parseInt($(this).attr('data-option')));
            });

            keyDownHandler();
        }

        function keyDownHandler(e) {
            e = e || window.event;
            var keyCode = e.keyCode;

            // TAB, ENTER, END, RIGHT --> select an item
            if (keyCode === 9 || keyCode === 13 || keyCode === 35 || keyCode === 39) {
                // if something is selected
                if (currentHover || fillItem) {
                    itemSelect({}, currentHover || fillItem);
                    return false; // prevent form submit
                }
            }
        }

        function keyUpHandler(e) {
            e = e || window.event;
            var keyCode = e.keyCode;

            // TAB, ENTER, PAGE UP, PAGE DOWN, END, RIGHT --> do nothing
            if ([9, 13, 33, 34, 35, 39].indexOf(keyCode) !== -1) { return; }

            // ESCAPE --> hide list and selected items
            if (keyCode === 27) {
                dropDown.hide();
                fillItem = null;
                currentHover = null;
                originalInput.focus();
                return false;
            }

            processInputText();

            handleUpAndDownKeys(keyCode);

            fillItem = currentHover || topItem || null;
            itemHover();
            updateHint(fillItem);
        }

        function processInputText() {
            partialText = originalInput.val().trim();
            var regex = new RegExp('^' + partialText + '.+$');
            var matches = options.map(function(s) { return regex.test(s); });
            matchedIds = [];

            for (var i = 0; i < matches.length; i++) {
                if (matches[i]) {
                    matchedIds.push(i);
                }
            }

            // determine autophil and hover states
            var currentHoverIsInTheList = matchedIds.indexOf(currentHover) !== -1;
            noMatches = matchedIds.length === 0;
            topItem = noMatches ? null : matchedIds[0];
            currentHover = currentHoverIsInTheList ? currentHover : null;

            // toggle list elements
            dropDown.toggle(!noMatches && partialText.length > 0);
            if (!noMatches) {
                var num = 0;
                listItems.each(function(i, li) {
                    var $li = $(li);
                    // toggle row
                    if (matches[i] && ++num < maxSuggestions) {
                        $li.show();
                        $li.html(partialText + '<b>' + options[i].substr(partialText.length) + '</b>');
                    } else {
                        $li.hide();
                    }
                });
            }
        }

        function handleUpAndDownKeys(keyCode) {
            // UP
            if (keyCode === 38 && !noMatches) {
                var lastVisible = matchedIds[matchedIds.length - 1];
                var currIndex = matchedIds.indexOf(currentHover);
                currentHover = currentHover && currentHover > 0 ? matchedIds[currIndex - 1] : lastVisible;
                itemHover();
            }

            // DOWN
            if (keyCode === 40 && !noMatches) {
                // failed match (-1 + 1) will go to index 0
                currentHover = matchedIds[matchedIds.indexOf(currentHover) + 1];
                if (!currentHover) currentHover = 0;
                itemHover();
            }
        }

        function itemHover(id) {
            currentHover = typeof id !== 'undefined' ? id : currentHover;
            listItems.removeClass('ap-hover');

            if (parseInt(currentHover) > -1) {
                listItems.eq(currentHover).addClass('ap-hover');
                updateHint(currentHover);
            }
        }

        function updateHint(id) {
            hiddenInput.val(id !== null ? options[id] : '');
        }

        function removeHint(e) {
            hiddenInput.val('');
        }

        function itemSelect(e, id) {
            currentHover = null;
            itemFill = null;
            itemHover();
            originalInput.val(listItems.eq(id).text());
            keyUpHandler(e);
        }
    }

    $.fn.autophil.destroy = function(originalInput) {
        console.log(originalInput);
        if (originalInput.hasClass('ap-input')) {
            var oldWrapper = originalInput.parent();
            var wrapperParent = oldWrapper.parent();
            var wrapperPrevious = oldWrapper.prev();

            if (wrapperPrevious.length) {
                originalInput.insertAfter(wrapperPrevious);
            } else {
                originalInput.prependTo(wrapperParent);
            }

            oldWrapper.remove();

            originalInput.css({
                'position': '',
                'top': '',
                'left': '',
                'width': '',
                'background-color': ''
            }).removeClass('ap-input').before(' ');
        }
    }

    

})(jQuery, document, window, undefined);
