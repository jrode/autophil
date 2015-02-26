autophil
========
The Genesis of autofills.

# Usage

Create:
```
$('input').autophil({
	opts: [
		'how do you get pink eye',
		'how do you build a snowman',
		'how do you build a snowman in minecraft',
		'how do you get bed bugs']
});
```

![autophil screenshot](https://github.com/jrode/autophil/raw/master/img/screenshot.png)

Destroy:
```
$('input').autophil('destroy');
```

Options:
* `opts`: []
* `maxSuggestions`: 10
* `delim`: '|'
* `tabStopOnDelimiter`: false
* `multiStringMatch`: false


