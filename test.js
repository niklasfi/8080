var filename = "Stieg_Larsson__Vergebung_Millennium_11.02.27_22-00_zdf_90_TVOON_DE.mpg.HQ.avi.otrkey"

if(!(matches= filename.match(/^([a-zA-Z0-9_]+)_([0-9]+).([0-9]+).([0-9]+)_([0-9]+)-([0-9]+)_([a-z0-9]+)_(\d+)_TVOON_DE\.mpg(((\.avi)|(\.otrkey)|(\.cut)|(\.HD)|(\.mp4)|(\.HQ)|(\.ac3))+)$/))) return null;
		
		var file={
			filename: filename,
			title: matches[1].replace(/\_/g," "),
			start: new Date('20'+matches[2],matches[3],matches[4],matches[5],matches[6]),
			station: matches[7],
			duration: matches[8],
			present: true,
			filesize: 1235
		};
		
		var split = matches[9].split('.');
			for (var i in split)
				if(split[i].length>0)
					file[split[i]] = true;
					
		console.log(file);
