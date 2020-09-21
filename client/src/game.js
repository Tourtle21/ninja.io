const Phaser = require("phaser");
const Colyseus = require("colyseus.js");
const clone = require("clone");

const gameConfig = require("./../../config.json");

const endpoint =
  window.location.hostname === "localhost"
    ? `ws://localhost:${gameConfig.serverDevPort}` // development (local)
    : `${window.location.protocol.replace("http", "ws")}//${
        window.location.hostname
      }`; // production (remote)

const colyseus = new Colyseus.Client(endpoint);
const treeAmount = 50;
const gameWidth = 2000;
const gameHeight = 2000;
let createStar = false;
let changeTab = false;
let mouseX = 0;
let mouseY = 0;
let createdPlayer = false;
let selectedTab = 0;


const handleLeaderboard = (players, myID) => {
    const leaderboard = document.querySelector('#game-overlay > .leaderboard');
    leaderboard.innerHTML = null;
    const header = document.createElement('h3');
    header.innerHTML = 'Leaderboard';
    leaderboard.appendChild(header);
    players.forEach(player => {
        const playerDiv = document.createElement('div');
        playerDiv.className = "player";
        playerDiv.id = `p${player.id}`;
        const text = document.createElement('div');
        text.className = "text";
        const name = document.createElement('p');
        name.className = "name";
        name.innerHTML = player.name;
        if (player.id === myID) {
            name.style.color = "#8BE1FF";
        }
        text.appendChild(name);
        const score = document.createElement('p');
        score.className = "score";
        if (player.id === myID) {
            score.style.color = "#8BE1FF";
        }
        score.innerHTML = player.score;
        text.appendChild(score);
        playerDiv.appendChild(text);
        leaderboard.appendChild(playerDiv);
    });
};
const handleResources = (num) => {
  console.log(document.getElementsByClassName('resource-amount')[0]);
  document.getElementsByClassName('resource-amount')[0].innerHTML = num;
}
const handleTab = () => {
  document.getElementsByClassName('item')[0].style.background = "url(../asset/ninjaStar.png";
  document.getElementsByClassName('item')[0].style.backgroundSize = "50%";
  document.getElementsByClassName('item')[0].style.backgroundPosition = "center";
  document.getElementsByClassName('item')[0].style.backgroundRepeat = "no-repeat";
  document.getElementsByClassName('item')[1].style.background = "url(../asset/pickaxe.png";
  document.getElementsByClassName('item')[1].style.backgroundSize = "50%";
  document.getElementsByClassName('item')[1].style.backgroundPosition = "center";
  document.getElementsByClassName('item')[1].style.backgroundRepeat = "no-repeat";
}
module.exports = class Game extends Phaser.Scene {
  constructor() {
    super("Game");
  }

  init() {
    this.room = null;
    this.roomJoined = false;
    this.cursors = null;
    this.players = {};
    this.ninjaStars = {};
    this.enemies = {};
    this.safeZones = {};
    this.scores = [];
    this.back_layer = this.add.group();
    this.mid_layer = this.add.group();
    this.front_layer = this.add.group();
  }

  preload() {
    this.load.image("logo", "asset/logo.png");
    this.load.image("ninja", "asset/ninja.png");
    this.load.image("tree", "asset/tree.png");
    this.load.image("ninjaStar", "asset/ninjaStar.png")
    this.load.image("bull", "asset/bull.png")
    this.load.image("goblin", "asset/goblin.png")
    this.load.image("spear", "asset/spear.png")
    this.load.image("healthBackground", "asset/healthBackground.png")
    this.load.image("health", "asset/health.png")
    this.load.image("safeZone", "asset/safeZone.png");
    this.load.image("pickaxe", "asset/pickaxe.png");
  }

  create() {
    handleTab();
    this.back_layer.setDepth(0);
    this.mid_layer.setDepth(1);
    this.front_layer.setDepth(2);
    document.getElementById("start").addEventListener("click", () => {
      let itemBar = document.getElementById("item-bar")
      itemBar.style.display = "flex";
      document.addEventListener('keydown', (e) => {
        if (e.which == 9) {

          var items = document.getElementsByClassName("item");
          items[selectedTab].classList.remove("selected");
          selectedTab += 1;
          if (selectedTab >= items.length) {
            selectedTab = 0;
          }
          items[selectedTab].classList.add("selected");
          changeTab = true;
        }
      })
      document.getElementById("input-overlay").style.display = "none";
      this.connect();
      this.cameras.main.setBackgroundColor("black");
      for (var i = 0; i < treeAmount - 1; i++) {
        this.front_layer.create(-1000, -1000, "tree");
      }
      this.input.keyboard.addKey(68);
      this.input.keyboard.addKey(65);
      this.input.keyboard.addKey(83);
      this.input.keyboard.addKey(87);
      this.input.keyboard.addKey(13);
      this.input.keyboard.addKey(9);
      this.cursors = this.input.keyboard.createCursorKeys();
      document.addEventListener('click', function(e) {
        createStar = true;
        mouseX = e.clientX;
        mouseY = e.clientY;
      })
    });
  }

  update() {
    if (this.roomJoined) {
      if (createdPlayer == false) {
        var name = document.getElementById("displayName").value;
        this.room.send({name:name, joinGame:true});
        createdPlayer = true;
      }
      let move = {
        move: true,
        left: this.input.keyboard.keys[65].isDown,
        right: this.input.keyboard.keys[68].isDown,
        up: this.input.keyboard.keys[87].isDown,
        down: this.input.keyboard.keys[83].isDown,
        enter: this.input.keyboard.keys[13].isDown,
        tab: this.input.keyboard.keys[9].isDown
      };
      if (this.roomJoined) {
        this.room.send(move);
      }
      if (createStar) {
        createStar = false;
        this.room.send({click: true, mouseX: mouseX, mouseY: mouseY, windowHeight:window.innerHeight, windowWidth:window.innerWidth})
      } if (changeTab) {
        changeTab = false;
        this.room.send({tabbing: true, mouseX: mouseX, mouseY: mouseY, windowHeight:window.innerHeight, windowWidth:window.innerWidth});
      }
    }
  }

  connect() {
    var rect = new Phaser.Geom.Rectangle(-gameWidth, -gameHeight, gameWidth*2, gameHeight*2);
      var graphics = this.add.graphics({ fillStyle: { color: 0x99cc00 } });
      graphics.fillRectShape(rect);
    var self = this;
    this.room = colyseus.join("main", {});
    this.room.onJoin.add(function() {
            self.roomJoined = true;
    });
    this.room.listen("players/:id", function(change) {
      if (change.operation == "add") {
        self.addPlayer(change.value);
      } else if (change.operation == "remove") {
        self.removePlayer(change.path.id);
      }
      handleLeaderboard(self.scores, self.room.sessionId);
    });

    this.room.listen("players/:id/:attribute", function(change) {
      if (change.operation == "replace") {
        let path = change.path;
        if (path.attribute == "x" || path.attribute == "y") {
          self.players[path.id].sprite[path.attribute] = change.value;
          self.players[path.id].healthBackground[path.attribute] = change.value;
          self.players[path.id].health[path.attribute] = change.value;
          self.players[path.id].text[path.attribute] = path.attribute == "x" ?
                        change.value - (self.players[path.id].text.displayWidth / 2) :
                        change.value - 74;
          if (path.attribute == "y") {
            self.players[path.id].healthBackground[path.attribute] = change.value + 50;
            self.players[path.id].health[path.attribute] = change.value + 50;
          } else {
            self.players[path.id].health[path.attribute] = change.value - (100-self.players[path.id].health.scaleX*1000)/2;
          }
        }
        if (path.attribute == "angle") {
          self.players[path.id].sprite[path.attribute] = change.value;
        } else if (path.attribute == "score") {
           const score = self.scores.filter(a => a.id === path.id)[0];
           let i = self.scores.indexOf(score);
           score[path.attribute] = change.value;
           self.scores[i] = score;
           self.scores = self.scores.sort((a, b) => b.score - a.score);
           handleLeaderboard(self.scores, self.room.sessionId);
        } else if (path.attribute == "health") {
          self.players[path.id].health.scaleX = change.value/1000;
          self.players[path.id].health['x'] = self.players[path.id].sprite.x - (100-change.value)/2;
        } else if (path.attribute == 'trees') {
          
        }
        if (path.attribute == "swingDeg") {
          self.players[change.path.id].sprite.angle += change.value;
        } 
        if (path.attribute === "resources") {
          handleResources(change.value);
        }
      }
    });
    this.room.listen("players/:id/:attribute/:id", function(change) {
      if (change.operation == "replace") {
        let path = change.path;
        if (path.attribute == "item") {
          if (typeof change.value === "string" && change.value != '' ) {            let oldItem = self.players[change.rawPath[1]].sprite.list[1];
            self.players[change.rawPath[1]].sprite.remove(oldItem);
            let newItem = self.front_layer.create(20, -20, change.value).setScale(0.5);
            self.players[change.rawPath[1]].sprite.add(newItem);
          } else if (change.value === '') {
            let oldItem = self.players[change.rawPath[1]].sprite.list[1];
            self.players[change.rawPath[1]].sprite.remove(oldItem);
          }
        }
      };
    });
    this.room.listen("trees/:id", function(change) {
      if (change.operation == "add") {
        self.addTree(change);
      }
    });
    this.room.listen("ninjaStars/:id", function(change) {
      if (change.operation == "add") {
        self.addStar(change);
      } else if (change.operation == "remove") {
        self.removeStar(change.path.id);
      }
    })
    this.room.listen("enemies/:id", function(change) {
      if (change.operation == "add") {
        self.addEnemies(change);
      } else if (change.operation == "remove") {
        self.removeEnemy(change.path.id);
      }
    })
    this.room.listen("safeZones/:id", function(change) {
      if (change.operation == "add") {
        self.addSafeZone(change);
      } else if (change.operation == "remove") {
        self.removeSaveZone(change.path.id);
      }
    })
    this.room.listen("safeZones/:id/:attribute", function(change) {
      self.safeZones[change.path.id].sprite[change.path.attribute] = change.value;
    })
    this.room.listen("enemies/:id/:attribute", function(change) {
      self.enemies[change.path.id].sprite[change.path.attribute] = change.value;
    })
    this.room.listen("ninjaStars/:id/:attribute", function(change) {
      self.ninjaStars[change.path.id].sprite[change.path.attribute] = change.value;
      self.ninjaStars[change.path.id].sprite.angle += 25.2;
    })
  }


  addTree(data) {
    this.mid_layer.create(data.value.x, data.value.y, "tree");
  }

  addStar(data) {
    let id = data.path.id;
    this.ninjaStars[id] = {};
    let sprite = this.front_layer.create(data.value.x, data.value.y, "ninjaStar").setScale(0.5);
    this.ninjaStars[id].sprite = sprite;
  }
  addSafeZone(data) {
    let id = data.path.id;
    this.safeZones[id] = {};
    let sprite = this.back_layer.create(data.value.x, data.value.y, "safeZone").setScale(0.5);
    sprite.setDepth(-1);
    this.safeZones[id].sprite = sprite;
  }

  addEnemies(data) {
    let id = data.path.id;
    let scale = 2;
    this.enemies[id] = {};
    if (data.value.name == "goblin") {
      scale = 0.6;
    } if (data.value.name == "spear") {
      scale = 0.9;
    }
    let sprite = this.mid_layer.create(data.value.x, data.value.y, data.value.name).setScale(scale);
    this.enemies[id].sprite = sprite;
  }

  addPlayer(data) {
    let id = data.id;
    this.players[id] = {};
    if (id == this.room.sessionId) {
      // var rect = new Phaser.Geom.Rectangle(-data.gameWidth, -gameHeight, data.gameWidth*2, data.gameWidth*2);
      // var graphics = this.add.graphics({ fillStyle: { color: 0x99cc00 } });
      // graphics.fillRectShape(rect);
    }
    let sprite = this.add.container(data.x, data.y);
    let character = this.front_layer.create(0, 0, "ninja");
    let item = this.front_layer.create(20, -20, data.item.name).setScale(0.5);
    let healthBackground = this.front_layer.create(data.x, data.y + 50, "healthBackground").setScale(0.1);
    let health = this.front_layer.create(data.x, data.y + 50, "health").setScale(0.099);
    let text = this.add.text(data.x, data.y, ` ${data.name} `, { color: 'white', backgroundColor: 'rgba(0,0,0,0.7)', fontSize: '2rem' })
    text.x = data.x - (text.displayWidth / 2);
    text.y = data.y - 74;
    text.depth = 2;
    health.scaleY = 0.08;
    character.setScale(0.5);
    sprite.add([character, item])
    this.players[id].sprite = sprite;
    this.players[id].healthBackground =  healthBackground;
    this.players[id].health =  health;
    this.players[id].text = text;
    this.players[id].item = item;
    if (id == this.room.sessionId) {
      this.cameras.main.startFollow(this.players[id].sprite);
    }
    const s = { id:id, name:data.name, score:data.score };
    this.scores.push(s);
    this.scores = this.scores.sort((a, b) => b.score - a.score);
  }


  removePlayer(id) {
    this.players[id].healthBackground.destroy();
    this.players[id].health.destroy();
    this.players[id].text.destroy();
    this.players[id].sprite.destroy();
    const score = this.scores.filter(a => a.id === id)[0];
    let i = this.scores.indexOf(score);
    this.scores.splice(i, 1);
    delete this.players[id];
  }
  removeStar(id) {
    this.ninjaStars[id].sprite.destroy();
    delete this.ninjaStars[id];
  }
  removeSafeZone(id) {
    this.safeZones[id].sprite.destroy();
    delete this.safeZones[id];
  }
  removeEnemy(id) {
    this.enemies[id].sprite.destroy();
    delete this.enemies[id];
  }
};
