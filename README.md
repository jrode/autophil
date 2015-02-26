autophil
========
The Genesis of autofills.

Usage
=====

Create:
```
$('input').autophil({
	opts: [
		'how you get pink eye',
		'how do you build a snowman',
		'how do you build a snowman in minecraft',
		'how do you get bed bugs']
})
```

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


