var fs = require('fs'),
	conf = JSON.parse(fs.readFileSync('./8081.conf'))

var logger = exports;

noop = function(){}

var choice = ['db','watchdog','customs','traffic','server'];

for(var i in choice){
	exports[choice[i]]=conf.log[choice[i]] ? console.log : noop;
}
