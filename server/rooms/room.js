const Room = require('colyseus').Room;
const treeAmount = 100;
const enemyAmount = 20;
const gameWidth = 2000;
const gameHeight = 2000;
const chaseDistance = 1000;
let ninjaIndex = 0;
let enemySpeed = 3;
let enemyIndex = 0;
let windowWidth = 0;
let windowHeight = 0;
let speed = 5;
const ninjaStarSpeed = 7;
module.exports = class MyRoom extends Room {

    onInit () {
        this.setState({
            players: {},
            trees: {},
            ninjaStars: {},
            enemies: {},
            safeZones: {}
        })
    }

    onJoin (client, options) {

    }

    onMessage (client, data) {
      let player = this.state.players[client.sessionId];
      if (data.move && player) {
        if (data.left && player.x - player.radius > -gameWidth) {
            player.x -= speed;
            player.directionX = -speed;
        }
        else if (data.right && player.x + player.radius < gameWidth) {
            player.x += speed;
            player.directionX = speed;
        } else {
          player.directionX = 0;
        }

        if (data.up && player.y - player.radius > -gameHeight) {
            player.y -= speed;
            player.directionY = -speed;
        }
        else if (data.down && player.y + player.radius< gameHeight) {
            player.y += speed;
            player.directionY = speed;
        } else {
          player.directionY = 0;
        }
        if (data.enter) {
          let d = new Date();
          let timestamp = d.getTime();
          var seconds;
          if (this.state.safeZones[client.sessionId]) {
            seconds = Math.floor((d - this.state.safeZones[client.sessionId].time)/1000);
          }
          if (seconds > 60 || !this.state.safeZones[client.sessionId]) {
            this.state.players[client.sessionId].hasSafeZone = true;
            this.state.safeZones[client.sessionId] = {x: player.x, y: player.y, time:timestamp};
          }
        }
        if (player.directionY == 0 && player.directionX != 0) {
          player.angle = 90 * player.directionX + player.swingDeg;
        } else if (player.directionX == 0 && player.directionY == speed) {
          player.angle = 180 + player.swingDeg;
        } else if (player.directionX == 0 && player.directionY == -speed) {
          player.angle = 0 + player.swingDeg;
        } else {
          if(player.directionY != 0 && player.directionX != 0) {
            if (player.directionY == -speed) {
              player.angle = 135 * -player.directionX + player.swingDeg;
            } else {
              player.angle = 45 * -player.directionX + player.swingDeg;
            }
          }
        }
      }
      if (data.tabbing) {
        if (player.item.index >= player.items.length - 1) {
          player.item = player.items[0];
          player.attackSpeed = player.item.attackSpeed;
        } else {
          player.item = player.items[player.item.index + 1];
          player.attackSpeed = player.item.attackSpeed;
        }
      }
      else if (data.click && player && player.attackTime >= player.attackSpeed) {
        if (player.item.throwable) {

          windowWidth = data.windowWidth;
          windowHeight = data.windowHeight;
          let mouseX = data.mouseX - windowWidth/2;
          let mouseY = data.mouseY - windowHeight/2;
          let mouseDX;
          let mouseDY;
          if (mouseX > 0) {
            mouseDX = Math.cos(Math.atan(mouseY / mouseX));
            mouseDY = Math.sin(Math.atan(mouseY / mouseX));
          } else {
            mouseDX = -Math.cos(Math.atan(mouseY / mouseX));
            mouseDY = -Math.sin(Math.atan(mouseY / mouseX));
          }
          let newStar = {
            x: player.x - 3,
            y: player.y - 1,
            dx: mouseDX,
            dy: mouseDY,
            addedX: player.directionX,
            addedY: player.directionY,
            radius: 16,
            player: client.sessionId,
            totalLife: 50,
            life: 0
          }
          ninjaIndex += 1;
          this.state.ninjaStars[ninjaIndex] = newStar
        } else if (player.item.mining) {
          let hitTrees = this.checkResourceCollision(player, data);
          player.attackTime = 0;
          player.swing = true;
          if (hitTrees.length > 0) {
            hitTrees.forEach( tree => {
              if (tree.angle >= tree.angleLow && tree.angle <= tree.angleHigh) {
                player.resources++;
              }
            })
          }
        }
      } else if (data.joinGame) {
        var self = this;
        this.state.players[client.sessionId] = {
            isPlayer:true,
            x: 200,
            y: 200,
            id: client.sessionId,
            directionX: 0,
            directionY: 0,
            angle: 0,
            maxHealth: 100,
            health: 100,
            radius: 31.25,
            name: data.name,
            attackSpeed: 50, 
            attackTime: 0,
            swing: false,
            swingDeg: 0,
            score: 0,
            resources:0,
            items: [{name: "ninjaStar", throwable:true, index:0, attackSpeed: 50}, {name: "pickaxe", mining:true, index:1, radius: 41.25, attackSpeed: 20}, {name: "", index:2}, {name: "", index:3}, {name: "", index:4}],
            item: {name:"ninjaStar", throwable:true, index:0},
            gameWidth: gameWidth,
            gameHeight: gameHeight,
            trees:[],
        }
        if (Object.keys(this.state.players).length === 1) {
          // CREATE INTERVAL FOR MOVING NINJASTARS and ENEMIES
          setInterval(() => {
            if (Object.keys(this.state.players).length > 0) {
              if (Object.keys(this.state.ninjaStars).length > 0) {
                Object.keys(this.state.ninjaStars).forEach(starId => {
                  let star = this.state.ninjaStars[starId];
                  // star.addedX && star.addedY
                  star.x += star.dx * ninjaStarSpeed;
                  star.y += star.dy * ninjaStarSpeed;
                  star.life += 1;
                  if (star.life >= star.totalLife) {
                    delete this.state.ninjaStars[starId];
                  }
                  Object.keys(this.state.players).forEach(playerId => {
                    if (this.checkCollision(star, this.state.players[playerId]) && this.state.players[playerId] != this.state.players[star.player]) {
                      // delete this.state.players[playerId]
                    }
                  })
                  if (Object.keys(this.state.enemies).length > 0) {
                    Object.keys(this.state.enemies).forEach(enemyId => {
                      let enemy = this.state.enemies[enemyId];
                      if (enemy.attackType !== 'ammo' && this.checkCollision(enemy, star)) {
                        this.state.players[star.player].score += 10;
                        delete this.state.enemies[enemyId];
                        // delete this.state.ninjaStars[starId];
                      }
                    })
                  }
                });     
              }
              if (Object.keys(this.state.enemies).length > 0) {
                this.moveEnemies();
              } if (Object.keys(this.state.players).length > 0) {
                Object.keys(this.state.players).forEach(playerId => { 
                  const player = this.state.players[playerId]   
                  player.attackTime += 1;
                  if (player.swing) {
                    //15 DEG
                    let percent = player.attackTime / player.attackSpeed;
                    let change = 0;
                    if (percent < 0.5) change = -6;
                    else change = 6;
                    player.swingDeg += change;
                    player.angle += change;
                    if (percent > 1) {
                      player.swing = false;
                      player.angle = player.angle - player.swingDeg;
                      player.swingDeg = 0;
                    }                   
                  }
                });
              }
            }
          }, 15)
        }


          // CREATE THE TREES
          for (var i = 0; i <= treeAmount; i++) {
            let treeX = Math.random() * (gameWidth * 2) - gameWidth;
            let treeY = Math.random() * (gameHeight * 2) - gameHeight;
            this.state.trees[i] = {x: treeX, y: treeY, height:103, width: 61};
          }


          // CREATE THE ENEMIES
          for (var i = 0; i <= enemyAmount; i++) {
            let enemyX = Math.random() * (gameWidth * 2) - gameWidth;
            let enemyY = Math.random() * (gameHeight * 2) - gameHeight;
            this.state.enemies[enemyIndex] = {x: enemyX, y: enemyY, name: 'goblin', speed:enemySpeed, damage:20, attackType:"ranged", attackDistance: 200, attackTime:0, attackSpeed: 300,radius: 30, angle: 0};
            enemyIndex += 1;
            enemyX = Math.random() * (gameWidth * 2) - gameWidth;
            enemyY = Math.random() * (gameHeight * 2) - gameHeight;
            this.state.enemies[enemyIndex] = {x: enemyX, y: enemyY, name: 'bull', damage: 20, speed:enemySpeed, attackType:"touch", radius: 45, angle: 0};
            enemyIndex += 1;
          }

        }
      }
    
  moveEnemies() {
    Object.keys(this.state.enemies).forEach(enemyId => {
      let enemy = this.state.enemies[enemyId];
      if (enemy.attackType != 'ammo') {
        let enemyD = this.moveTowardsPlayer(enemy.x, enemy.y);
        if (enemyD.closestPlayer) {
          if (enemy.attackType != 'ranged' || !this.checkCollision(this.state.players[enemyD.closestPlayer], enemy)) {
            enemy.x -= enemyD.dx * enemy.speed;
            enemy.y -= enemyD.dy * enemy.speed;
          } else if (enemy.attackType == 'ranged' && enemy.attackTime >= enemy.attackSpeed) {
            this.rangedAttack(enemy, enemyD);
            enemy.attackTime = 0;
          }
          if (enemy.attackType === 'ranged') {
            enemy.attackTime += 1;
          }
          if (enemy.attackType === 'touch' && this.checkCollision(enemy, this.state.players[enemyD.closestPlayer])) {
            this.state.players[enemyD.closestPlayer].health -= enemy.damage;
            delete this.state.enemies[enemyId];
          }
          enemy.angle = enemyD.degrees;  
        } 
      } else {
          enemy.x -= enemy.dx * enemy.speed;
          enemy.y -= enemy.dy * enemy.speed;
          if (Object.keys(this.state.players).length > 0) {
            Object.keys(this.state.players).forEach(playerId => {
              if (this.checkCollision(this.state.players[playerId], enemy)) {
                this.state.players[playerId].health -= enemy.damage;
                delete this.state.enemies[enemyId];
              }
            })
          };
        }
      
    })
  }
  rangedAttack(position, direction) {
    this.state.enemies[enemyIndex] = {x: position.x, y: position.y, name: 'spear', damage:position.damage, attackType:"ammo", radius: 30, angle: direction.degrees, speed:8, dx: direction.dx, dy:direction.dy};
    enemyIndex += 1;
  }
   moveTowardsPlayer(x, y) {
     if (Object.keys(this.state.players).length >= 1) {
       let closestPlayer = null;
       let closestDistance = 0;
       Object.keys(this.state.players).forEach(playerId => {
       if (!this.state.players[playerId].hasSafeZone || !this.checkSafeCollision(this.state.players[playerId], this.state.safeZones[playerId])) {
           if (closestPlayer == null) {
             closestPlayer = playerId;
             closestDistance = Math.sqrt((x - this.state.players[playerId].x) ** 2 + (y - this.state.players[playerId].y) ** 2);
           } else {
             let distanceX = x - this.state.players[playerId].x;
             let distanceY = y - this.state.players[playerId].y;
             let distance = Math.sqrt(distanceX ** 2 + distanceY ** 2);
             if (distance <= closestDistance) {
               closestPlayer = playerId;
               closestDistance = distance;
             }
           }
         }
        });
       if (closestDistance > chaseDistance || closestDistance == 0) {
         return { dx: 0, dy:0, degrees: 0, closestPlayer: false}
       }
       let distanceX = x - this.state.players[closestPlayer].x;
       let distanceY = y - this.state.players[closestPlayer].y;
       let dx;
       let dy;
       let degrees = 0;
       if (distanceX >= 0) {
        dx = Math.cos(Math.atan(distanceY / distanceX));
        dy = Math.sin(Math.atan(distanceY / distanceX));
        degrees = Math.atan(distanceY / distanceX) * (180 / Math.PI) - 90;
       } else {
        dx = -Math.cos(Math.atan(distanceY / distanceX));
        dy = -Math.sin(Math.atan(distanceY / distanceX));
        degrees = -Math.atan(distanceY / -distanceX) * (180 / Math.PI) + 90;
       }
       return { dx: dx, dy: dy, degrees: Math.round(degrees), closestPlayer: closestPlayer};
     } else {
          return { dx: 0, dy: 0, degrees: 0, closestPlayer: false}
       };
    }

    checkResourceCollision(player, data) {
      let hitTrees = [];
      Object.keys(this.state.trees).forEach(treeId => {
        if (player.x + player.item.radius > this.state.trees[treeId].x - this.state.trees[treeId].width/2 && player.x - player.item.radius < this.state.trees[treeId].x + this.state.trees[treeId].width/2 &&
            player.y + player.item.radius > this.state.trees[treeId].y - this.state.trees[treeId].height/2 && player.y - player.item.radius < this.state.trees[treeId].y + this.state.trees[treeId].height/2) {
              windowWidth = data.windowWidth;
              windowHeight = data.windowHeight;
              let mouseX = data.mouseX - windowWidth/2;
              let mouseY = data.mouseY - windowHeight/2;
              let angleHigh;
              let angleLow;
              let treeDX = this.state.trees[treeId].x - player.x;
              let treeDY = this.state.trees[treeId].y - player.y
              if (treeDX > 0) {
                angleHigh = Math.atan((treeDY / treeDX) + (Math.PI/6));
                angleLow = Math.atan((treeDY / treeDX) - (Math.PI/6));
              } else {
                angleHigh = -Math.atan((treeDY / treeDX) + (Math.PI/6));
                angleLow = -Math.atan((treeDY / treeDX) - (Math.PI/6));
              }
              let angle = Math.atan(mouseY / mouseX);
              console.log(angleHigh, angleLow, angle)
              hitTrees.push({angleHigh, angleLow, angle});
            }
      });
      return hitTrees;
    }


    checkCollision (object1, object2) {
      var distX = (object1.x - object2.x);
      var distY = (object1.y - object2.y);
      let object1Radius = object1.attackDistance && object2.isPlayer ? object1.attackDistance : object1.radius;
      let object2Radius = object2.attackDistance && object1.isPlayer ? object2.attackDistance : object2.radius;
      if (Math.sqrt(distX ** 2 + distY ** 2) < object1Radius + object2Radius) {
        return true;
      } else {
        return false;
      }
    }
    checkSafeCollision(object1, object2) {
      var squareRadius = 250;
      if (object1.x - object1.radius * 5 > object2.x - squareRadius && object1.x + object1.radius* 5 < object2.x + squareRadius
          && object1.y - object1.radius * 5 > object2.y - squareRadius && object1.y + object1.radius * 5 < object2.y + squareRadius) {
            return true;
          } else {
            return false;
          }
    }
    onLeave (client) {
        delete this.state.players[ client.sessionId ];
    }

}
