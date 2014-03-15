var spawn  = require('child_process').spawn;
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

	var cgminer = spawn('/home/lemma/Desktop/start_miner.sh', []);
	cgminer.stderr.setEncoding('utf8');

	//cgminer.stderr.on('data', function (data) { console.log("ERR: "+data); });

	cgminer.stderr.on('data', function (data) {
		var datalist = data.split("\n");

		for(var i = 0; i < datalist.length; i++) {
		    if(datalist[i].length > 0) {
		        try{
					cgminer.stdout.write('\u001B[2J\u001B[0;0f');
					console.log('\u001B[2J\u001B[0;0f');
					dataString = datalist[i].substring(12);
					console.log(dataString);
		            var jdata = JSON.parse(dataString);
					//Format: "{gpuNum : %d, hashRate: %.1f, temp:%.1f}"					
					stats.gauge(gauge_prefix+".GPU"+jdata.gpuNum+".HashRate", jdata.hashRate);
					stats.gauge(gauge_prefix+".GPU"+jdata.gpuNum+".Temp", jdata.temp);						
		        } catch(err) {
		            console.log("err:", err);
		        }
		    }
		}
	});

	cgminer.on('close', function (code) {
		console.log('child process exited with code', code);

		// cudaminer closed, exit node process
		process.exit(1);
	});
}

function connect_delay(){
	get_interface();
	if(gauge_prefix == 0){
		console.log('network inferface not found, waiting 10 seconds');
		setTimeout(connect_delay, 10000);
	} else {
		start_mining();
	}
}

connect_delay();

