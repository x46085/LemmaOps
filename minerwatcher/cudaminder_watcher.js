var spawn  = require('child_process').spawn;
var execute= require('child_process').exec;
var StatsD = require('node-statsd').StatsD;
var os     = require('os');
var stats  = new StatsD();

var gauge_prefix = 0;
var mac = "00:00:00:00:00:00";

function get_interface(){
	var ifaces=os.networkInterfaces();
	for (var dev in ifaces) {
	  var alias=0;
	  ifaces[dev].forEach(function(details){
		if (details.family=='IPv4') {
		  //console.log(dev+(alias?':'+alias:''),details.address);
		  if(details.address != 0 && details.address != "127.0.0.1"){
		  	gauge_prefix = details.address;
			mac = ifaces[dev][1].address;
			//console.log(ifaces[dev][1].address);
		  }
		  ++alias;
		} 
	  });
	}
	
}

function start_mining(){
	gauge_prefix_array = gauge_prefix.split(".");
	//console.log(guage_prefix_array[3]);
	gauge_prefix = gauge_prefix_array[2]+"_"+gauge_prefix_array[3];

	var mac_array = mac.split("::");
	mac = mac_array[1];
	mac_array = mac.split(":");
	mac = mac_array[0]+mac_array[1]+mac_array[2]+mac_array[3];
	console.log(mac);

	var current_temp = 0;
	var cudatemp = execute('nvidia-settings -q gpucoretemp -t',
	  function (error, stdout, stderr) { current_temp = parseInt(stdout); });

	//console.log(current_temp);

	// example: "[2014-06-01 13:03:12] GPU #0: GeForce GTX 560 Ti, 198.73 khash/s"
	var regexMatchAll = /^\[.+\].+, ([0-9\.]+).+$/;
	var regexSplit = /.+, /;
	var regexMatchHash = /([0-9]+[ ][k][h])/;

	var id = Math.floor(Math.random()*30);
	// blake
	/*
	var args = ["--algo=blake",
		    "--url=stratum+tcp://la1.blakecoin.com:3334", 
		    "--user=BTG-LTG-miningtest."+gauge_prefix,
		    "--pass=x",
		    "--launch-config=F408x10",
		    "--hash-parallel=2",
		    "--lookup-gap=256",
		    "--interactive=0",
		    "--texture-cache=0",
		    "-b=2048",
		    "--single-memory=0"];*/

	// x11
	var args = ["--algo=x11",
		    "--url=stratum+tcp://pool.ipominer.com:3335", 
		    "--user=x46085."+id,
		    "--pass=x"];

	var cudaminer = spawn('/home/lemma/ccminer/ccminer', args);
	console.log(cudaminer+" "+args);

	//var cudaminer = spawn('/home/lemma/Desktop/start_miner.sh', []);

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
				var hashRate = result[1].split(" ");
				//console.log(hashRate[0]);
				cudatemp = execute('nvidia-settings -q gpucoretemp -t',
		  			function (error, stdout, stderr) { current_temp = parseInt(stdout); });
				stats.gauge(mac+".HashRate", parseInt(hashRate[0]));
				stats.gauge(mac+".Temp", current_temp);
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


