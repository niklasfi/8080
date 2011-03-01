var fs = require('fs'),
	log = require('./logger.js').watchdog;
	m = require('./models.js'),
	conf = JSON.parse(fs.readFileSync('./8081.conf'));

var path = conf.server.watchdogPath;

this.findFiles = function(){
	var that = this;
	fs.readdir(path,function(err,dirfiles){
		m.files.available(function(dbfiles){
			if(err) throw err;

			var filelist = {};
			for(var i in dbfiles)
				filelist[dbfiles[i].filename]=true;

			for(var i in dirfiles){
				if(!(dirfiles[i] in filelist)) that.checkFile(dirfiles[i]);
			}
		})
	})
}

this.checkFile = function(filename){
	var that = this;
	m.files.get(filename,function(file){
		if(file && file.present) return;
		
		fs.stat(path+filename, function(err, stats){
			if(err) throw err;
			if(!stats.isFile()) return
			if(file){
				file.present = true;
				file.filesize = stats.size;
				m.files.update(file,function(file){
					log('+ '+filename);
					fs.watchFile(path+filename, (function(curr,prev){that.onFileChange(filename,curr,prev);}).bind(that));
				});
			}
			else m.files.create(filename,stats.size,function(file){
				if(file === null) return;
				log('+ '+filename);
				fs.watchFile(path+filename, (function(curr,prev){that.onFileChange(filename,curr,prev);}).bind(that));
			})
		});
	});
}

this.onFileChange = function(filename,curr,prev){
	m.files.get(filename,function(file){
		if(file){
			if(curr.nlink)
				file.filesize = curr.size;
			else{
				file.present = false;
				log('- '+ filename);
			}
			m.files.update(file)
		}
		else
			this.addFile(filename);
	})
}

this.fetch = function(){
	m.files.dropall((this.findFiles).bind(this));
	setInterval((this.findFiles).bind(this),10000);
}
