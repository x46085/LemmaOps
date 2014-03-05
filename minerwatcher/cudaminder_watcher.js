var spawn = require('child_process').spawn;
var StatsD = require('node-statsd').StatsD;
var stats = new StatsD();

var cudaminer = "/data/temp/bitz/CudaMiner.jstty/cudaminer";
var args = ["--benchmark"];

var cudaminer = spawn(cudaminer, args);

cudaminer.stderr.setEncoding('utf8');
cudaminer.stderr.on('data', function (data) {
    var datalist = data.split("\n");

    for(var i = 0; i < datalist.length; i++) {
        if(datalist[i].length > 0) {
            try{
                //console.log(datalist[i]);
                var jdata = JSON.parse(datalist[i]);

                jdata.gfxCard.replace(" ", "_")
                stats.gauge("gpu"+jdata.gpuNum +
                    "." + jdata.gfxCard.replace(" ", "_") +
                    ".hashRate",
                    jdata.hashRate
                );
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
