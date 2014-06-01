var spawn  = require('child_process').spawn;
var execute= require('child_process').exec;
var StatsD = require('node-statsd').StatsD;
var os     = require('os');
var stats  = new StatsD();

var gauge_prefix = 0;

function get_interface(){
	var ifaces=os.networkInterfaces();
	for (var dev in ifaces) {
	  var alias=0;
	  ifaces[dev].forEach(function(details){
		if (details.family=='IPv4') {
		  //console.log(dev+(alias?':'+alias:''),details.address);
		  if(details.address != 0 && details.address != "127.0.0.1"){
		  gauge_prefix = details.address;
		  }
		  ++alias;
		} 
	  });
	}
}

function start_mining(){
	gauge_prefix_array = gauge_prefix.split(".");
	//console.log(guage_prefix_array[3]);
	gauge_prefix = gauge_prefix_array[3];

	var current_temp = 0;
	var cudatemp = execute('nvidia-settings -q gpucoretemp -t',
	  function (error, stdout, stderr) { current_temp = parseInt(stdout); });

	//console.log(current_temp);

	// example: "[2014-06-01 13:03:12] GPU #0: GeForce GTX 560 Ti, 198.73 khash/s"
	var regexMatchAll = /^\[.+\].+, ([0-9\.]+).+$/
	var regexSplit = /.+, /
	var regexMatchHash = /([0-9]+\.[0-9][0-9])/

	var cudaminer = spawn('/home/lemma/Desktop/start_miner.sh', []);
	cudaminer.stderr.setEncoding('utf8');
	cudaminer.stderr.on('data', function (data) {
		var datalist = data.split("\n");

		for(var i = 0; i < datalist.length; i++) {
		    if(datalist[i].length > 0) {
			console.log(datalist[i]);
		        try{
			    var result = datalist[i].split(regexMatchHash);
			    if (result.length > 1){			    
				//console.log(result[1]);
				cudatemp = execute('nvidia-settings -q gpucoretemp -t',
		  			function (error, stdout, stderr) { current_temp = parseInt(stdout); });
				stats.gauge(gauge_prefix+".HashRate", parseInt(result[1]));
				stats.gauge(gauge_prefix+".Temp", current_temp);
			    }
		        } catch(err) {
		            //console.log("err:", err);
		            console.log("ERROR PARSING: "+datalist[i]);
		        }
		    }
		}
	});

	cudaminer.on('close', function (code) {
		console.log('child process exited with code', code);

		// cudaminer closed, exit node process
		process.exit(1);
	});
}

function connect_delay(){
	get_interface();
	if(gauge_prefix == 0){
		console.log('network inferface not found, waiting 10 seonds');
		setTimeout(connect_delay, 10000);
	} else {
		start_mining();
	}
}

connect_delay();

			    /* Old Miner Stats, requires modifying cudaminer:
		            var jdata = JSON.parse(datalist[i]);
					console.log(datalist[i]);		
					if(jdata["gfxCard"]){  
						//Format: "{gpuNum:%d , gfxCard:%s, hashes:%lu, hashRate:%s }" 
						cudatemp = execute('nvidia-settings -q gpucoretemp -t',
		  		    		function (error, stdout, stderr) { current_temp = parseInt(stdout); });
						jdata.gfxCard.replace(" ", "_");
						stats.gauge(gauge_prefix+".GPU"+jdata.gpuNum+".HashRate", jdata.hashRate);
						stats.gauge(gauge_prefix+".GPU"+jdata.gpuNum+".Temp", current_temp);
					} else if (jdata["accepted"]){ 
						//Format: "{accepted:%lu, rejected:%lu, percent:%.2f%%, khashs:%s, success: %s}"
						if(Boolean(jdata.success)){
							stats.increment(gauge_prefix+".AcceptCount");
						} else {
							stats.increment(gauge_prefix+".RejectCount");
						}
						stats.gauge(gauge_prefix+".TotalKHs", jdata.khashs);
						stats.gauge(gauge_prefix+".AcceptPercent", jdata.percent);
					}
			   */

