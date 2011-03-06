var fs = require('fs'),
	conf = JSON.parse(fs.readFileSync('./8081.conf')),
	log = require('./logger.js').traffic,
	spawn = require('child_process').spawn
	m = require('./models.js');
	
var lastState = {tx: null,time: null, remaining: null}
this.getTx = function(){
	var sigma = '';
	var ifconfig = spawn('ifconfig',[conf.server.device]);
	ifconfig.stdout.on('data',function(chunk){
		sigma += chunk;
	})
	ifconfig.on('exit',function(code){
		if(code !== 0) log('ifconfig exited with code ' + code);
		var matches = sigma.match('TX bytes:([0-9]+)')
		var cur = {tx: parseInt(matches[1]), time: Date.now()};
		if(lastState.tx && lastState.time){
			var avgspeed = (cur.tx - lastState.tx)/(cur.time - lastState.time)
			cur.remaining = Math.max(0,Math.round((conf.traffic.availableBandwidth * .9 - avgspeed) / conf.traffic.avgClientBandwidth))
			if(cur.remaining > 0) 
				m.tickets.activateNext(cur.remaining,function(affectedRows){
					log('average speed: ' + avgspeed + ' in last ' + (cur.time-lastState.time) + 'ms. ' + cur.remaining + ' new connnections available')
					cur.remaining -= affectedRows;
					lastState = cur;
				});
			else
				lastState = cur;
		}
		else
			lastState = cur;
	})
}

this.light = function(){
	lastState.remaining--;
	log((lastState.remaining>=0) ? 'green': 'red')
	return (lastState.remaining>=0)
	
}

this.start = function(){
	this.getTx();
	setInterval(this.getTx,conf.traffic.monitoringInterval);
}
