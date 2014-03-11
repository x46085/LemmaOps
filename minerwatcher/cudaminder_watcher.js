var spawn  = require('child_process').spawn;
var execute= require('child_process').exec;
var StatsD = require('node-statsd').StatsD;
var os     = require('os');
var stats  = new StatsD();

var ifaces=os.networkInterfaces();
var guage_prefix = 0;

for (var dev in ifaces) {
  var alias=0;
  ifaces[dev].forEach(function(details){
    if (details.family=='IPv4') {
      //console.log(dev+(alias?':'+alias:''),details.address);
      if(details.address != 0 && details.address != "127.0.0.1"){
   	guage_prefix = details.address;
      }
      ++alias;
    } 
  });
}

guage_prefix_array = guage_prefix.split(".");
//console.log(guage_prefix_array[3]);
guage_prefix = guage_prefix_array[3];

var current_temp = 0;
var cudatemp = execute('nvidia-settings -q gpucoretemp -t',
  function (error, stdout, stderr) { current_temp = parseInt(stdout); });

//console.log(current_temp);

var cudaminer = spawn('/home/lemma/Desktop/start_miner.sh', []);
cudaminer.stderr.setEncoding('utf8');
cudaminer.stderr.on('data', function (data) {
    var datalist = data.split("\n");

    for(var i = 0; i < datalist.length; i++) {
        if(datalist[i].length > 0) {
            try{		
                var jdata = JSON.parse(datalist[i]);
		console.log(datalist[i]);		
		cudatemp = execute('nvidia-settings -q gpucoretemp -t',
  		    function (error, stdout, stderr) { current_temp = parseInt(stdout); });
		jdata.gfxCard.replace(" ", "_");
                //console.log("$", guage_prefix+" "+jdata.hashRate+" khash/s : "+current_temp+" C");
		stats.gauge(guage_prefix+".GPU"+jdata.gpuNum+".HashRate", jdata.hashRate);
		stats.gauge(guage_prefix+".GPU"+jdata.gpuNum+".Temp", current_temp);
            } catch(err) {
                //console.log("err:", err);
                console.log(datalist[i]);
            }
        }
    }
});

cudaminer.on('close', function (code) {
    console.log('child process exited with code', code);

    // cudaminer closed, exit node process
    process.exit(1);
});
