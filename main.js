main();
async function main() {
  //関数
  async function sleep(waitMsec) {
    var startMsec = new Date();
    while (new Date() - startMsec < waitMsec);
  }
  async function judge_sit() {
    sleep(250);
    PassSec_sit++;
    showPassage();
  }
  async function judge_stand() {
    sleep(1000);
    PassSec_stand++;
    showPassage();
  }
  var msg_sit;
  var msg_stand;
  async function showPassage() {
    msg_sit = "着席してから" + PassSec_sit + "秒が経過しました。";
    msg_stand = "離席してから" + PassSec_stand + "秒が経過しました。";
  }
  async function stopShowing_sit() {
    PassSec_sit = 0;
  }
  async function stopShowing_stand() {
    PassSec_stand = 0;
  }
  async function moter() {
    // ポートを初期化するための非同期関数
    var gpioAccess = await navigator.requestGPIOAccess(); // thenの前の関数をawait接頭辞をつけて呼び出します。
    var ports_recline = [];
    var ports_reverse = [];

    for (var i = 0; i < 2; i++) {
      ports_recline[i] = gpioAccess.ports.get(portAddrs_recline[i]);
      await ports_recline[i].export("out");
      ports_reverse[i] = gpioAccess.ports.get(portAddrs_reverse[i]);
      await ports_reverse[i].export("out");
    }
    for (var j = 0; j < 2; j++) {
      ports_recline[j].write(0);
    }
    portPromise_recline = ports_recline;
    portPromise_reverse = ports_reverse;
  }
  async function free_recline() {
    var ports = await portPromise_recline;
    ports[0].write(0);
    ports[1].write(0);
  }
  async function free_reverse() {
    var ports = await portPromise_reverse;
    ports[0].write(0);
    ports[1].write(0);
  }
  async function fwd() {
    var ports = await portPromise_recline;
    ports[0].write(1);
    ports[1].write(0);
  }
  async function rev() {
    var ports = await portPromise_reverse;
    ports[0].write(0);
    ports[1].write(1);
  }
  //非同期関数は await を付けて呼び出します。
  const gpioAccess = await navigator.requestGPIOAccess(); // GPIO を操作する
  const port = gpioAccess.ports.get(26); // 26 番ポートを操作する

  await port.export("out"); // ポートを出力モードに設定

  var dist = document.getElementById("dist");
  var alert = document.getElementById("alert");
  var used = document.getElementById("used");
  var sit = document.getElementById("sit");
  var stand = document.getElementById("stand");
  var i2cAccess_dist = await navigator.requestI2CAccess();
  var i2c = i2cAccess_dist.ports.get(1);
  var vl = new VL53L0X(i2c, 0x29);
  await vl.init(); // for Long Range Mode (<2m) : await vl.init(true);
  //モーター
  var portAddrs_recline = [20, 21]; // Hブリッジコントローラ(倒す用)をつなぐGPIOポート番号
  var portPromise_recline;
  var portAddrs_reverse = [19, 26]; // Hブリッジコントローラ(倒す用)をつなぐGPIOポート番号
  var portPromise_reverse;
  await moter();

  //処理
  var PassSec_sit = 0;
  var PassSec_stand = 0; // 秒数カウント用変数
  var set_time_sit = 10; //座り過ぎを決める変数,背もたれを倒す時間変数
  var set_time_stand = 10; //離席してから背もたれを起こす時間変数
  var music = new Audio("Warning.mp3"); //警告音
  var f = 0;
  var c = 0;

  project();
  async function project() {
    while (true) {
      //console.log(distance);
      var distance = await vl.getRange();
      dist.innerHTML = distance;

      //着席時
      if (distance <= 200) {
        stopShowing_stand();
        used.style.backgroundColor = "#ff0000";
        sit.style.backgroundColor = "#ff0000";
        stand.style.backgroundColor = "#FFF";
        used.style.color = "#FFF";
        stand.style.color = "#0000ff";
        sit.style.color = "#FFF";

        sleep(750);
        judge_sit(); //着席時間を計測
        document.getElementById("PassageArea_sit").innerHTML = msg_sit; // 表示更新

        //30秒以上座っていたら警告！
        if (PassSec_sit >= set_time_sit) {
          //music.play();
          alert.innerHTML = "座りすぎ"; // alert('座りすぎです');
          music.play(); // 再生
          if (PassSec_sit >= set_time_sit && PassSec_sit < set_time_sit + 2)
            fwd();
          if (PassSec_sit === set_time_sit + 2) free_recline();
          else if (PassSec_sit === set_time_sit + 4) music.pause();
          else if (PassSec_sit > set_time_sit && f !== 0) {
            music.play();
            if (c === 0) fwd();
            else if (c === 2) free_recline();
            c++;
          }
        }
      }
      //離席時
      else {
        //初めて座ってから立つと作動
        if (msg_sit) {
          free_recline();
          judge_stand();
          document.getElementById("PassageArea_stand").innerHTML = msg_stand; // 表示更新
          //離席してから10秒は座っているとする
          if (PassSec_stand < set_time_stand) {
            music.pause();
            f = 1;
            // rev(0);
            judge_sit();
            document.getElementById("PassageArea_sit").innerHTML = msg_sit;
            sit.style.backgroundColor = "#ff0000";
            stand.style.backgroundColor = "#FFF";
            stand.style.color = "#0000ff";
            sit.style.color = "#FFF";
          }
          //11秒以上離席していたら離席とする
          else {
            stand.style.backgroundColor = "#ff0000";
            sit.style.backgroundColor = "#FFF";
            stand.style.color = "#FFF";
            sit.style.color = "#0000ff";
            alert.innerHTML = " ";
            if (PassSec_stand >= set_time_stand + 3) {
              //完全に離席→背もたれ起きる

              if (
                PassSec_stand >= set_time_stand + 3 &&
                PassSec_stand < set_time_stand + 6
              ) {
                rev();
              } else if (PassSec_stand === set_time_stand + 6) free_reverse();

              used.style.backgroundColor = "#FFF";
              used.style.color = "#0000ff";
              stopShowing_sit();
            }
          }
        }
      }
    }
  }
}
