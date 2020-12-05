let c = document.getElementById("canvas");
let ctx = c.getContext("2d");
let fps = 60;
let width = 1024;
let height = 512;
c.width = width;
c.height = height;

let objectList = [];
let keyList = {};
let ShowHitBox = false

let game = true;
// UI for pause
$("#pause").hide();
$("#restart").hide();
$(".restartHard").hide();
$("#resume").hide();
$("#quit").hide();
$(".infiniteMode").hide();
$("#gameOver").hide();
$("#door").hide();
$("#clickDoor").hide();

//constructors
class Battler {
  constructor(id, hp, width, height) {
    this.id = id;
    this.x = 0;
    this.y = 0;
    this.width = width;
    this.height = height;
    this.damage = 10;
    this.speed = 5;
    this.hp = hp;
    this.maxhp = hp;
    this.facingRight = 1;
    this.currentFrame = 0;
    this.hitBox = sprite[id].hitBox;
    this.totalFrame = sprite[id].totalFrame || 1;
    //stand, walk, attack
    this.currentAction = "stand";
    for (let keys in sprite[id]){
      if (sprite[id][keys].nodeName === "IMG"){
        this[`${keys}Animation`] = sprite[id][keys];
      }
    }
    //import
    this.identifier = parseInt(String(Math.random()).substring(2))
    objectList.push(this);
  }

  jumpTo(x, y) {
    if (!this.isProjectile){
      let realX = x;
      if (this.facingRight === 0){
        realX -= this.width;
      }
      if (realX < -20){
        x = -20;
        if (this.facingRight === 0){
          x += this.width;
        }
      }
      if (realX > width - this.width){
        x = width - this.width;
        if (this.facingRight === 0){
          x += this.width;
        }
      }
      if (y > height - this.height){
        y = height - this.height;
      }
      if (y < -25){
        y = -25;
      }
    }
    this.x = x;
    this.y = y;
  }
  
  flipAround(){
    if (this.facingRight === 0) {
      this.facingRight = 1;
      this.x -= this.width;
    }else{
      this.facingRight = 0;
      this.x += this.width;//change to hitbox
    }
  }

  changeAction(action) {
    //animation
    if (typeof action !== "string") {
      return;
    }
    this.currentFrame = 0;
    if (this[`${action}Animation`]){
      this.totalFrame = Math.floor(this[`${action}Animation`].width / this.width);
    }else{
      this.totalFrame = 0;
    }
    this.currentAction = action;
  }

  isCollide(another) {
    //check x
    let rect1, rect2;
    if (this.facingRight === 1){
      rect1 = {x: this.x + this.hitBox[1][0], y: this.y + this.hitBox[1][1], width: this.hitBox[1][2], height: this.hitBox[1][3]}
    }else{
      rect1 = {x: this.x + this.hitBox[0][0], y: this.y + this.hitBox[0][1], width: this.hitBox[0][2], height: this.hitBox[0][3]}
    }
    if (another.facingRight === 1){
      rect2 = {x: another.x + another.hitBox[1][0], y: another.y + another.hitBox[1][1], width: another.hitBox[1][2], height: another.hitBox[1][3]}
    }else{
      rect2 = {x: another.x + another.hitBox[0][0], y: another.y + another.hitBox[0][1], width: another.hitBox[0][2], height: another.hitBox[0][3]}
    }
    
    if (rect1.x < rect2.x + rect2.width &&
     rect1.x + rect1.width > rect2.x &&
     rect1.y < rect2.y + rect2.height &&
     rect1.y + rect1.height > rect2.y){
      //console.log("collide");
      return true;
    }else{
      return false;
    }
  }
  
  gainHp(value){
    //if (this.changeAI)
    this.hp += value;
    if (this.hp <= 0){
      if (this === mainChar){
        $("#gameOver").show();
        $("#restart").show();
        $(".restartHard").show();
        $("#quit").show();
        $(".infiniteMode").show();
        pause();
      }
      this.destroySelf();
    }
    
    if(this.changeAI === true){
      //console.log(this.hp/this.maxhp, this.newAI.threshold, this.hp/this.maxhp < this.newAI.threshold)
      if(this.hp/this.maxhp < this.newAI.threshold) {
        this.AI.initial = this.newAI.AI[0]
        this.AI.repeat = this.newAI.AI[1]
        //this.changeAI = false
      }
    }
  }
  
  destroySelf(){
    for (let i = 0; i < objectList.length; i ++){
      if (objectList[i].identifier === this.identifier){
        objectList.splice(i, 1);
        break;
      }
    }
    if (this.stage){
      this.stage.removeEnemy(this);
    }
    if (this.isPrince){
      dialogueController.queue.push(new Dialogue("I'm free cy@", "https://cdn.glitch.com/2d713a23-b2e0-4a6b-9d5c-61c597ba6d8e%2Fprince.png?v=1594593855915", true));
      dialogueController.queue.push(new Dialogue("I'm mad now! I will defeat you first then capture the prince back!", "https://cdn.glitch.com/2d713a23-b2e0-4a6b-9d5c-61c597ba6d8e%2Fred2.png?v=1594600316442", true));
      dialogueController.renderDialogue();
    }
  }
}

class Projectile extends Battler {
  constructor(id, hp, width, height, speed, dir, damage, isFriendly) {
    super(id,hp,width,height)
    this.speed = speed;
    this.facingRight = dir;
    this.damage = damage;
    this.isFriendly = isFriendly
    this.isProjectile = true;
  }
  
  behavior(){
    if (this.facingRight){
      this.jumpTo(this.x + this.speed, this.y);
    }else{
      this.jumpTo(this.x - this.speed, this.y);
    }
    this.gainHp(-1);
  }
}

class Main extends Battler {
  constructor(id, hp, width, height) {
    super(id, hp, width, height);
    this.isMainChar = true;
  }
}

class Mobs extends Battler {
  constructor(id, hp, width, height, stage) {
    super(id, hp, width, height);
    this.isMainChar = false;
    this.AI = {
      initial: ["toPlayerY", "facePlayer"],
      repeat: ["rangedAttack10", "wait1000", "toPlayer", "wait250", "toPlayerY", "facePlayer","heal"]
    };
    this.count = 0;
    this.act;
    if (stage){
      this.stage = stage;
      stage.newEnemy(this);
    }
    this.changeAI = false
  }
  
  onAttack(){
    //fill whatever
    //damage player if colliding
    if (this.isCollide(mainChar)){
      mainChar.gainHp(-this.damage);
    }
  }
  
  onRangeAttack(summoner){
    //summon bullet
    let bulletYOffset = 0;
    if(summoner.id === 4){
      bulletYOffset = -4
    }
    let bullet = new Projectile(2,60,128,128, 10, summoner.facingRight, 1, false)
    bullet.jumpTo(summoner.x + summoner.hitBox[summoner.facingRight][0], summoner.y+bulletYOffset);
  }
  
  behavior() {
    //should run every time handlemoveframe function runs
    //check if act exist
    if (this.act) {
      //act
      //toPlayer
      if (this.act === "toPlayer"){
        //check if collide with main
        if (this.isCollide(mainChar)){
          //resolve
          this.resolveAct("toPlayer");
        }else{
          //move towards player
          if (this.x < mainChar.x){
            this.jumpTo(this.x + this.speed, this.y);
            if (this.facingRight === 0){
              this.facingRight = 1;
              this.x -= this.width;//change to hitbox
            }
          }else{
            this.jumpTo(this.x - this.speed, this.y);
            if (this.facingRight === 1){
              this.facingRight = 0;
              this.x += this.width;//change to hitbox
            }
          }
          if (this.y < mainChar.y){
            this.jumpTo(this.x, this.y + this.speed);
          }else{
            this.jumpTo(this.x, this.y - this.speed);
          }
        }
        return;
      }
      if (this.act === "toPlayerX"){
        if (this.x - mainChar.x <= this.hitBox[this.facingRight][2]){
          this.resolveAct("toPlayerX");
        }else{
          //move towards player
          if (this.x < mainChar.x){
            this.jumpTo(this.x + this.speed, this.y);
            if (this.facingRight === 0){
              this.facingRight = 1;
              this.x -= this.width;//change to hitbox
            }
          }else{
            this.jumpTo(this.x - this.speed, this.y);
            if (this.facingRight === 1){
              this.facingRight = 0;
              this.x += this.width;//change to hitbox
            }
          }
        }
        return;
      }
      if (this.act === "toPlayerY"){
        if (this.y - mainChar.y <= this.hitBox[0][3] / 4 && this.y + (this.hitBox[0][3] / 4) >= mainChar.y){
          this.resolveAct("toPlayerY");
          
        }else{
          if (this.y < mainChar.y){
            this.jumpTo(this.x, this.y + this.speed);
          }else{
            this.jumpTo(this.x, this.y - this.speed);
          }
        }
        return;
      }
      if (this.act === "facePlayer"){
        if (this.x < mainChar.x && !this.facingRight){
          this.flipAround();
        }else if (this.x > mainChar.x && this.facingRight){
          this.flipAround();
        }
        this.resolveAct("facePlayer");
        return;
      }
      if (this.act === "attack"){
        if (this.currentAction !== "attack"){
          this.changeAction("attack");
          this.onAttack();
        }
        return;
      }
      if (this.act === "summon"){
        if (objectList[2].isPrince){
          if (randomInt(0, 2) === 0){
            let mob = new Mobs(4, 50, 128, 128, this.stage);
            mob.jumpTo(this.x, this.y);
            mob.speed = 3;
            //range bot
            mob.AI = {
              initial: [],
              repeat: ["toPlayerY", "facePlayer", "rangedAttack20", "toPlayer"]
            }
          }else{
            let mob = new Mobs(1, 75, 128, 128, this.stage);
            mob.jumpTo(this.x, this.y);
            mob.speed = 2;
            //range bot
            mob.AI = {
              initial: [],
              repeat: ["toPlayer", "wait250", "attack", "wait1000"]
            }
            mob.damage = 5
          }
        }
        this.resolveAct(this.act);
        return;
      }
      if (this.act === "summon2"){
        if (randomInt(0, 2) === 0){
          let mob = new Mobs(4, 50, 128, 128, this.stage);
          mob.jumpTo(this.x, this.y);
          mob.speed = 3;
          //range bot
          mob.AI = {
            initial: [],
            repeat: ["toPlayerY", "facePlayer", "rangedAttack20", "toPlayer"]
          }
        }else{
          let mob = new Mobs(1, 75, 128, 128, this.stage);
          mob.jumpTo(this.x, this.y);
          mob.speed = 2;
          //range bot
          mob.AI = {
            initial: [],
            repeat: ["toPlayer", "wait250", "attack", "wait1000"]
          }
          mob.damage = 5
        }
        this.resolveAct(this.act);
        return;
      }
      if(this.act.includes("rangedAttack")){
        if (this.currentAction !== "attack2"){
          this.changeAction("attack2");
        }
        let repeatTimes = parseInt(this.act.substring(12));
        if (isNaN(repeatTimes)){
          repeatTimes = 1;
        }
        this.onRangeAttack(this);
        this.count ++;
        if (this.count >= repeatTimes){
          this.count = 0;
          this.resolveAct(this.act);
        }
        return;
      }
      
      if(this.act.includes("heal")){
        if(!isNaN(parseFloat(this.act.substring(4)))){
          this.gainHp(parseFloat(this.act.substring(4)))
        }
        if(this.hp > this.maxhp){
          this.hp = this.maxhp
        }
        return;
      }
      
      if (this.act.includes("wait")){
        this.changeAction("stand");
        if (this.selfTimer !== undefined){
          this.selfTimer += 1000/fps;
        }else{
          this.selfTimer = 0;
        }
        if (this.selfTimer >= parseInt(this.act.substring(4)) ){
          this.resolveAct(this.act);
          this.selfTimer = undefined;
        }
      }
      
    } else {
      //no act
      //read AI
      //do initial
      if (this.AI.initial.length > 0) {
        this.act = this.AI.initial[0];
        this.AI.initial.shift();
      } else {
        //do repeat
        this.act = this.AI.repeat[0];
        this.AI.repeat.push(this.AI.repeat.shift());
      }
    }
  }
  
  resolveAct(act){
    if (this.act === act){
      this.act = undefined;
    }
  }
}

class Boss extends Mobs{
  constructor(id, hp, width, height, stage) {
    super(id, hp, width, height, stage);
    this.changeAI = true
    this.newAI = {}
    this.newAI.threshold
    this.newAI.AI
  }
  
  gainHp(hp){
    if (!objectList[2].isPrince){
      super.gainHp(hp);
    }
  }
}

class DialogueController{
  constructor(){
    this.queue = [];
    this.showingDialogue = false;
    this.onDialogueFinish;
    //container
    let $container = $("<div>").addClass("dialogueContainer");
    this.setContainer($container);
    $("#canvasContainer").append($container);
    $container.hide();
    this.container = $container;
    //img
    let $img = $("<img>").addClass("dialogueImg");
    $container.append($img);
    this.img = $img;
    //text
    let $text = $("<div>").addClass("dialogueText");
    $container.append($text);
    this.text = $text;
  }
  
  attachHandler(){
    $(document).one("keypress", () => {
      this.resolveDialogue();
    });
  }
  
  setContainer(container, isTop){
    if (isTop){
      container.css("bottom", `${height + 7}px`);
    }else{
      container.css("bottom", `${height * 0.2}px`);
    }
    container.css("height", `${height * 0.2}px`);
  }
  
  renderDialogue(){
    pause();
    this.showingDialogue = true;
    this.container.show();
    let dialo = this.queue[0];
    this.img.attr("src", dialo.img);
    this.text.text(dialo.text);
    this.setContainer(this.container, dialo.isTop)
    this.attachHandler();
  }
  
  resolveDialogue(){
    this.queue.shift();
    if (this.queue.length > 0){
      this.renderDialogue();
    }else{
      play();
      this.showingDialogue = false;
      this.container.hide();
      if (this.onDialogueFinish){
        this.onDialogueFinish();
        this.onDialogueFinish = undefined;
      }
    }
  }
}

class Dialogue{
  constructor(text, img, isTop){
    this.text = text;
    this.img = img;
    this.isTop = isTop;
  }
}

class Stage{
  constructor(onStart, onEnd){
    this.enemyList = [];
    this.onEnd = onEnd;
    this.onStart = onStart;
  }
  
  startStage(){
    this.onStart(this);
  }
  
  newEnemy(enemy){
    this.enemyList.push(enemy);
  }
  
  removeEnemy(enemy){
    for (let i = 0; i < this.enemyList.length; i ++){
      if (enemy === this.enemyList[i]){
        this.enemyList.splice(i, 1);
        break;
      }
    }
    //check if empty
    if (this.enemyList.length === 0){
      if (this.onEnd){
        this.onEnd(this);
      }
    }
  }
}

//handling functions
function render() {
  //empty
  ctx.clearRect(0, 0, width, height);
  //render objects
  for (let key in objectList) {
    if (!objectList[key]){
      continue;
    }
    let object = objectList[key];
    let objectX = object.x;
    let objectY = object.y;
    let oWidth = object.width;
    let oHeight = object.height;
    let currentFrame = object.currentFrame;

    if (object.facingRight === 0) {
      //saving
      ctx.save();
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(
        object[`${object.currentAction}Animation`],
        currentFrame * oWidth,
        0,
        oWidth,
        oHeight,
        width - objectX,
        objectY,
        oWidth,
        oHeight
      );

      let facing = object.facingRight
      
      ctx.restore();
      ctx.beginPath();
      ctx.strokeStyle = "red";
      //hitbox rect
      if(ShowHitBox){
        ctx.rect(objectX+object.hitBox[0][0], objectY+object.hitBox[0][1], object.hitBox[0][2], object.hitBox[0][3]);
      }
      ctx.stroke();
      if (!object.isProjectile){
        //hpbar border
        ctx.beginPath();
        ctx.strokeStyle = "black";
        ctx.rect(objectX+object.hitBox[0][0], objectY+object.hitBox[0][1] - 20, object.hitBox[0][2], 10);
        ctx.stroke();
        //hpbar inner
        ctx.fillStyle = "#FF0000";
        ctx.fillRect(objectX+object.hitBox[0][0], objectY+object.hitBox[0][1] - 20, object.hitBox[0][2] * (object.hp / object.maxhp), 10);
      }
    } else {
      ctx.drawImage(
        object[`${object.currentAction}Animation`],
        currentFrame * oWidth,
        0,
        oWidth,
        oHeight,
        objectX,
        objectY,
        oWidth,
        oHeight
      );    
      ctx.beginPath();
      ctx.strokeStyle = "red";
      //hitbox rect
      if(ShowHitBox){
        ctx.rect(objectX+object.hitBox[1][0], objectY+object.hitBox[1][1], object.hitBox[1][2], object.hitBox[1][3]);
      }
      ctx.stroke();
      if (!object.isProjectile){
        //hpbar border
        ctx.beginPath();
        ctx.strokeStyle = "black";
        ctx.rect(objectX+object.hitBox[1][0], objectY+object.hitBox[1][1] - 20, object.hitBox[1][2], 10);
        ctx.stroke();
        //hpbar inner
        ctx.fillStyle = "#FF0000";
        ctx.fillRect(objectX+object.hitBox[1][0], objectY+object.hitBox[1][1] - 20, object.hitBox[1][2] * (object.hp / object.maxhp), 10);
      }
    }
  }
}

function handleKeys() {
  let checkMove = false;
  if (keyList["w"] || keyList["ArrowUp"]) {
    mainChar.jumpTo(mainChar.x, mainChar.y - mainChar.speed);
    checkMove = true;
  }
  if (keyList["a"] || keyList["ArrowLeft"]) {
    mainChar.jumpTo(mainChar.x - mainChar.speed, mainChar.y);
    if (mainChar.facingRight === 1) {
      mainChar.facingRight = 0;
      mainChar.x += mainChar.width;//change to hitbox
    }
    checkMove = true;
  }
  if (keyList["s"] || keyList["ArrowDown"]) {
    mainChar.jumpTo(mainChar.x, mainChar.y + mainChar.speed);
    checkMove = true;
  }
  if (keyList["d"] || keyList["ArrowRight"]) {
    mainChar.jumpTo(mainChar.x + mainChar.speed, mainChar.y);
    if (mainChar.facingRight === 0) {
      mainChar.facingRight = 1;
      mainChar.x -= mainChar.width;//change to hitbox
    }
    checkMove = true;
  }
  if (keyList["j"]) {
    if (mainChar.currentAction !== "attack") {
      mainChar.changeAction("attack");
      let bullet = new Projectile(2,60,128,128, 10, mainChar.facingRight, mainChar.damage, true)
      bullet.jumpTo(mainChar.x + mainChar.hitBox[mainChar.facingRight][0], mainChar.y+10)
    }
  }
  if (mainChar.currentAction !== "attack") {
    if (checkMove) {
      if (mainChar.currentAction !== "walk") {
        mainChar.changeAction("walk");
      }
    } else {
      mainChar.changeAction("stand");
    }
  }
}

function handleMoveFrames() {
  for (let key in objectList) {
    if (!objectList[key]){
      continue;
    }
    let object = objectList[key];
    object.currentFrame += 1;
    if (object.currentFrame >= object.totalFrame) {
      object.currentFrame = 0;
      //check if attacking
      if (object.currentAction.includes("attack")) {
        object.changeAction("walk");
        //check if a mob
        if (object.act){
          if (object.act.includes("attack")){
            object.resolveAct(object.act);
          }
        }
      }
    }
    if (object.behavior) {
      object.behavior();
    }
    
    
    if(object.id === 2){
      if(object.isFriendly){
        objectList.forEach((v,i)=>{
          if(v !== undefined && object.isCollide(v)){
            if(v.id === 1 || v.id === 3 || v.id === 4 || v.id === 5){ //check id to see if is enemy
              v.gainHp(-object.damage);
              object.gainHp(-2333); //kills bullet
              return;
            }
          }
        })
      }else{
        if(object.isCollide(mainChar)){
          mainChar.gainHp(-object.damage)
          object.gainHp(-2333); //kills bullet
        }
      }
    }
    
  }
}

//keyboard events
$(document).keydown(function(e) {
  keyList[e.key] = true;
});

$(document).keyup(function(e) {
  keyList[e.key] = false;
});

let sprite = [
  // {
  //   stand: "https://cdn.glitch.com/2d713a23-b2e0-4a6b-9d5c-61c597ba6d8e%2FcharStand.png?v=1594500675779",
  //   walk: "https://cdn.glitch.com/2d713a23-b2e0-4a6b-9d5c-61c597ba6d8e%2FcharAtk1Sprite.png?v=1594495768907",
  //   attack : "https://cdn.glitch.com/2d713a23-b2e0-4a6b-9d5c-61c597ba6d8e%2FcharAtk1Sprite.png?v=1594495768907",
  // },

  {
    //guy 0
    stand:
      "https://cdn.glitch.com/2d713a23-b2e0-4a6b-9d5c-61c597ba6d8e%2FguyWalk.png?v=1594501701844",
    walk:
      "https://cdn.glitch.com/2d713a23-b2e0-4a6b-9d5c-61c597ba6d8e%2FguyWalk.png?v=1594501701844",
    attack:
      "https://cdn.glitch.com/2d713a23-b2e0-4a6b-9d5c-61c597ba6d8e%2FguyAttack.png?v=1594502053544",
    attack2:
      "https://cdn.glitch.com/2d713a23-b2e0-4a6b-9d5c-61c597ba6d8e%2FguyAttack.png?v=1594502053544",
    block:
      "https://cdn.glitch.com/2d713a23-b2e0-4a6b-9d5c-61c597ba6d8e%2Fguy%20blocking.gif?v=1594581470432",
    hitBox: [[-110,16,85,109],[25,16,85,109]] //[[offset x, offset y, width, height],[]]
    //[[a, b, c, d], [e, f, g, h]]
    //a = -g - e
  },

  {
    //turrent 1
    stand:
      "https://cdn.glitch.com/2d713a23-b2e0-4a6b-9d5c-61c597ba6d8e%2FturrentWalk.png?v=1594499006955",
    walk:
      "https://cdn.glitch.com/2d713a23-b2e0-4a6b-9d5c-61c597ba6d8e%2FturrentWalk.png?v=1594499006955",
    attack:
      "https://cdn.glitch.com/2d713a23-b2e0-4a6b-9d5c-61c597ba6d8e%2FturrentShoot2.png?v=1594526056546",
    attack2:
      "https://cdn.glitch.com/2d713a23-b2e0-4a6b-9d5c-61c597ba6d8e%2FturrentShoot2.png?v=1594526056546",
    hitBox: [[-99, 25,81,97],[18, 25, 81, 97]]
  },
  {
    //bullet 2
    stand:
      "https://cdn.glitch.com/2d713a23-b2e0-4a6b-9d5c-61c597ba6d8e%2FguyBullet.png?v=1594510138936",
    walk:
      "https://cdn.glitch.com/2d713a23-b2e0-4a6b-9d5c-61c597ba6d8e%2FguyBullet.png?v=1594510138936",
    attack:
      "https://cdn.glitch.com/2d713a23-b2e0-4a6b-9d5c-61c597ba6d8e%2FguyBullet.png?v=1594510138936",
    attack2:
      "https://cdn.glitch.com/2d713a23-b2e0-4a6b-9d5c-61c597ba6d8e%2FguyBullet.png?v=1594510138936",
    hitBox: [[-70, 59,10,5],[60, 59, 10, 5]]
  },
  {
    //redprincess 3
    stand:
      "https://cdn.glitch.com/2d713a23-b2e0-4a6b-9d5c-61c597ba6d8e%2FredWalk.png?v=1594587149260",
    walk:
      "https://cdn.glitch.com/2d713a23-b2e0-4a6b-9d5c-61c597ba6d8e%2FredWalk.png?v=1594587149260",
    attack:
      "https://cdn.glitch.com/2d713a23-b2e0-4a6b-9d5c-61c597ba6d8e%2FredFire.png?v=1594585825786",
    attack2:
      "https://cdn.glitch.com/2d713a23-b2e0-4a6b-9d5c-61c597ba6d8e%2Fredshoot.png?v=1594584911893",
    hitBox: [[-119, 2,102,124],[17, 2, 102, 124]] 
  },
  {
  //trashcan 4
    stand:
      "https://cdn.glitch.com/2d713a23-b2e0-4a6b-9d5c-61c597ba6d8e%2Ftrashcanwalk.png?v=1594589217594",
    walk:
      "https://cdn.glitch.com/2d713a23-b2e0-4a6b-9d5c-61c597ba6d8e%2Ftrashcanwalk.png?v=1594589217594",
    attack:
      "https://cdn.glitch.com/2d713a23-b2e0-4a6b-9d5c-61c597ba6d8e%2Ftrashcanshoot.png?v=1594589348929",
    attack2:
      "https://cdn.glitch.com/2d713a23-b2e0-4a6b-9d5c-61c597ba6d8e%2Ftrashcanshoot.png?v=1594589348929",
    hitBox: [[-110,4,84,76],[25,4,84,76]] 
  },
  {
  //prince 5
    stand:
      "https://cdn.glitch.com/2d713a23-b2e0-4a6b-9d5c-61c597ba6d8e%2Fprince2.png?v=1594602266899",
    walk:
      "https://cdn.glitch.com/2d713a23-b2e0-4a6b-9d5c-61c597ba6d8e%2Fprince2.png?v=1594602266899",
    attack:
      "https://cdn.glitch.com/2d713a23-b2e0-4a6b-9d5c-61c597ba6d8e%2Fprince2.png?v=1594602266899",
    attack2:
      "https://cdn.glitch.com/2d713a23-b2e0-4a6b-9d5c-61c597ba6d8e%2Fprince2.png?v=1594602266899",
    hitBox: [[-105,6,100,110],[5,6,100,110]] 
  }
];

sprite.forEach((v, i) => {
  for (let keys in v) {
    if (typeof v[keys] === "string") {
      let href = v[keys];
      let img = new Image();
      img.src = href;
      sprite[i][keys] = img;
    }
  }
});

//render loop
let interval = setInterval(loop, 1000 / fps);

//initialize dialogue
let dialogueController = new DialogueController();

//staging
let stage1 = new Stage((stage) => {
  //stage start
  let mob = new Mobs(1, 100, 128, 128, stage);
  mob.jumpTo(800, 250);
  mob.speed = 2;
  //melee bot
  mob.AI = {
    initial: [],
    repeat: ["toPlayer", "wait250", "attack", "wait1000"]
  }
  render();
  dialogueController.queue.push(new Dialogue("Once upon a time the prince in kingdom Green has been captured. Princess Green is on her mission to save the captured prince! (Press any button to conintue)", "https://cdn.glitch.com/2d713a23-b2e0-4a6b-9d5c-61c597ba6d8e%2Fpic.jpg?v=1594589935586", true));
  dialogueController.queue.push(new Dialogue("Show me where the prince is! (Press any button to conintue)", "https://cdn.glitch.com/2d713a23-b2e0-4a6b-9d5c-61c597ba6d8e%2F2d713a23-b2e0-4a6b-9d5c-61c597ba6d8e_guyWalk.png?v=1594584060708", false));
  dialogueController.queue.push(new Dialogue("Beep! Unauthorized personnel! Keep OUT! (Press any button to conintue)", "https://cdn.glitch.com/2d713a23-b2e0-4a6b-9d5c-61c597ba6d8e%2Fturrentpic.png?v=1594586865187", true));
  dialogueController.renderDialogue();
}, (stage) => {
  //stage end
  dialogueController.onDialogueFinish = () => {
    currentStage = stage2;
    changeBackground();
    stage2.startStage();
  };
  dialogueController.queue.push(new Dialogue("BOOM! (Press any button to conintue)", "https://cdn.glitch.com/2d713a23-b2e0-4a6b-9d5c-61c597ba6d8e%2Fturrentpic.png?v=1594586865187", true));
  dialogueController.queue.push(new Dialogue("I am going forward! (Press any button to conintue)", "https://cdn.glitch.com/2d713a23-b2e0-4a6b-9d5c-61c597ba6d8e%2F2d713a23-b2e0-4a6b-9d5c-61c597ba6d8e_guyWalk.png?v=1594584060708", false));
  dialogueController.renderDialogue();
});

let stage2 = new Stage((stage) => {
  //stage start
  cleanseProjectile();
  mainChar.facingRight = 1;
  mainChar.jumpTo(50, 250);
  let mob = new Mobs(4, 100, 128, 128, stage);
  mob.jumpTo(800, 250);
  mob.speed = 3;
  //range bot
  mob.AI = {
    initial: [],
    repeat: ["toPlayerY", "facePlayer", "rangedAttack20"]
  }
  render();
  dialogueController.queue.push(new Dialogue("Another mob? I am not afraid!", "https://cdn.glitch.com/2d713a23-b2e0-4a6b-9d5c-61c597ba6d8e%2F2d713a23-b2e0-4a6b-9d5c-61c597ba6d8e_guyWalk.png?v=1594584060708", false));
  dialogueController.renderDialogue();
}, (stage) => {
  //stage end
  dialogueController.onDialogueFinish = () => {
    currentStage = stage3;
    changeBackground();
    stage3.startStage();
  };
  dialogueController.queue.push(new Dialogue("I'm going deeper (Press any button to conintue)", "https://cdn.glitch.com/2d713a23-b2e0-4a6b-9d5c-61c597ba6d8e%2F2d713a23-b2e0-4a6b-9d5c-61c597ba6d8e_guyWalk.png?v=1594584060708", false));
  dialogueController.renderDialogue();
});

let stage3 = new Stage((stage) => {
  //stage start
  cleanseProjectile();
  mainChar.facingRight = 1;
  mainChar.jumpTo(50, 250);
  //2 range 3 melee
  for (let i = 0; i < 3; i ++){
    let mob = new Mobs(1, 200, 128, 128, stage);
    mob.jumpTo(700, i * 150 + 50);
    mob.speed = 2;
    mob.AI ={
      initial: ["toPlayerX"],
      repeat: ["toPlayer", "wait250", "attack", "wait1000"]
    }
  }
  for (let i = 0; i < 2; i ++){
    let mob = new Mobs(4, 33, 128, 128, stage);
    mob.jumpTo(900, i * 200 + 100);
    mob.AI ={
      initial: ["facePlayer"],
      repeat: ["rangedAttack60", "wait1000"]
    }
  }
  render();
  dialogueController.queue.push(new Dialogue("That's a lot!", "https://cdn.glitch.com/2d713a23-b2e0-4a6b-9d5c-61c597ba6d8e%2F2d713a23-b2e0-4a6b-9d5c-61c597ba6d8e_guyWalk.png?v=1594584060708", false));
  dialogueController.renderDialogue();
}, (stage) => {
  //stage end
  dialogueController.onDialogueFinish = () => {
    currentStage = stage4;
    changeBackground();
    stage4.startStage();
  };
  dialogueController.queue.push(new Dialogue("It suddenly becomes silent.", "https://cdn.glitch.com/2d713a23-b2e0-4a6b-9d5c-61c597ba6d8e%2F2d713a23-b2e0-4a6b-9d5c-61c597ba6d8e_guyWalk.png?v=1594584060708", false));
  dialogueController.renderDialogue();
});

let stage4 = new Stage((stage) => {
  //stage start
  cleanseProjectile();
  mainChar.facingRight = 1;
  mainChar.jumpTo(496, 200);
  for (let i = 0; i < 8; i ++){
    let mob = new Mobs(1, 50, 128, 128, stage);
    mob.speed = 4;
    mob.AI ={
      initial: [],
      repeat: ["toPlayer", "wait"+randomInt(250, 1000), "attack", "wait"+randomInt(0, 750)]
    }
    if (i < 4){
      mob.jumpTo(50, i * 135 + 25);
    }else{
      mob.jumpTo(850, (i - 4) * 135 + 25);
    }
  }
  render();
  dialogueController.queue.push(new Dialogue("I am surrounded!", "https://cdn.glitch.com/2d713a23-b2e0-4a6b-9d5c-61c597ba6d8e%2F2d713a23-b2e0-4a6b-9d5c-61c597ba6d8e_guyWalk.png?v=1594584060708", false));
  dialogueController.renderDialogue();
}, (stage) => {
  //stage end
  dialogueController.onDialogueFinish = () => {
    currentStage = stage5;
    changeBackground();
    stage5.startStage();
  };
  dialogueController.queue.push(new Dialogue("I see the red palace, I am sure the prince is inside.", "https://cdn.glitch.com/2d713a23-b2e0-4a6b-9d5c-61c597ba6d8e%2F2d713a23-b2e0-4a6b-9d5c-61c597ba6d8e_guyWalk.png?v=1594584060708", false));
  dialogueController.renderDialogue();
});

let stage5 = new Stage((stage) => {
  //stage start
  cleanseProjectile();
  mainChar.facingRight = 1;
  mainChar.jumpTo(50, 200);
  let mob = new Boss(3, 1000, 128, 128, stage)
  mob.newAI = {threshold:0.50, AI:[["facePlayer"],["toPlayer", "wait150", "attack", "wait150", "rangedAttack5"]]}
  mob.jumpTo(800, 250);
  mob.speed = 5;
  mob.AI = {
    // initial: [],
    // repeat: ["toPlayer", "wait250", "attack", "wait1000"]
    initial: ["facePlayer"],
    repeat: ["toPlayerY", "rangedAttack10", "wait100","facePlayer", "summon", "toPlayerY", "rangedAttack10", "wait100","facePlayer"]
  }
  //prince
  let prince = new Mobs(5, 500, 128, 128, stage);
  prince.jumpTo(500, 380);
  prince.AI = {
    initial: [],
    repeat: []
  }
  prince.isPrince = true;
  prince.changeAction("walk")
  render();
  dialogueController.queue.push(new Dialogue("How did you get pass all those guards? Doesn't matter, I will stop you right here.", "https://cdn.glitch.com/2d713a23-b2e0-4a6b-9d5c-61c597ba6d8e%2Fred2.png?v=1594600316442", true));
  dialogueController.queue.push(new Dialogue("Free the prince! Princess Red!", "https://cdn.glitch.com/2d713a23-b2e0-4a6b-9d5c-61c597ba6d8e%2F2d713a23-b2e0-4a6b-9d5c-61c597ba6d8e_guyWalk.png?v=1594584060708", false));
  dialogueController.queue.push(new Dialogue("......", "https://cdn.glitch.com/2d713a23-b2e0-4a6b-9d5c-61c597ba6d8e%2Fprince.png?v=1594593855915", true));
  dialogueController.queue.push(new Dialogue("Princess Green, you fool! Look around you, everything here is powered by the prince. Without the prince, the people in kingdom Red will die!", "https://cdn.glitch.com/2d713a23-b2e0-4a6b-9d5c-61c597ba6d8e%2Fred2.png?v=1594600316442", true));
  dialogueController.queue.push(new Dialogue("You can find alternatives for power", "https://cdn.glitch.com/2d713a23-b2e0-4a6b-9d5c-61c597ba6d8e%2F2d713a23-b2e0-4a6b-9d5c-61c597ba6d8e_guyWalk.png?v=1594584060708", false));
  dialogueController.queue.push(new Dialogue("Like what?", "https://cdn.glitch.com/2d713a23-b2e0-4a6b-9d5c-61c597ba6d8e%2Fred2.png?v=1594600316442", true));
  dialogueController.queue.push(new Dialogue("Love, something more powerful than any fuel we had ever used before.", "https://cdn.glitch.com/2d713a23-b2e0-4a6b-9d5c-61c597ba6d8e%2F2d713a23-b2e0-4a6b-9d5c-61c597ba6d8e_guyWalk.png?v=1594584060708", false));
  dialogueController.queue.push(new Dialogue("That's impossible! We can't transition to love in a few days! We have to have the prince! Enough Talking, let's fight!", "https://cdn.glitch.com/2d713a23-b2e0-4a6b-9d5c-61c597ba6d8e%2Fred2.png?v=1594600316442", true));
  dialogueController.queue.push(new Dialogue("(Princess Red is powered by the prince, I should try to free the prince first.)", "https://cdn.glitch.com/2d713a23-b2e0-4a6b-9d5c-61c597ba6d8e%2F2d713a23-b2e0-4a6b-9d5c-61c597ba6d8e_guyWalk.png?v=1594584060708", false));
  dialogueController.renderDialogue();
}, (stage) => {
  //stage end
  dialogueController.onDialogueFinish = () => {
    currentStage = stage6;
    changeBackground();
  };
  dialogueController.queue.push(new Dialogue("Mission Accomplished", "https://cdn.glitch.com/2d713a23-b2e0-4a6b-9d5c-61c597ba6d8e%2F2d713a23-b2e0-4a6b-9d5c-61c597ba6d8e_guyWalk.png?v=1594584060708", false));
  dialogueController.renderDialogue();
});

let stage6 = new Stage((stage) => {
  cleanseProjectile();
})

let infiniteStage = new Stage((stage) => {
  let mob = new Mobs(1, 1, 128, 128, stage);
  mob.jumpTo(randomInt(width / 2, width), randomInt(0, height));
}, (stage) => {
  //on stage end repeat spawn
  cleanseProjectile();
  console.log(`Level ${stage.loop}`);
  dialogueController.queue.push(new Dialogue(`You are currently at loop ${stage.loop}! Good Luck~`, "https://cdn.glitch.com/2d713a23-b2e0-4a6b-9d5c-61c597ba6d8e%2Fpic.jpg?v=1594589935586", true));
  dialogueController.renderDialogue();
  c.style.backgroundImage = backgroundImages[randomInt(0, backgroundImages.length)];
  
  stage.loop += 1;
  mainChar.jumpTo(50, 200);
  let mobCount = randomInt(0, stage.loop / 3);
  if (mobCount > 10){
    mobCount = 10;
  }else if (mobCount <= 0){
    mobCount = 1;
  }
  let possibleID = [1, 3, 4, 5];
  let possibleAI = ["attack", "rangedAttack", "summon","heal"];
  let AIPack = {
    "attack": ["toPlayer", "wait","attack"],
    "rangedAttack": ["wait250", "toPlayerY", "facePlayer", "rangedAttack"],
    "heal": ["heal"],
    "summon": ["summon2", "wait"]
  }
  for (let i = 0; i < mobCount; i ++){
    let id = possibleID[randomInt(0, possibleID.length)];
    let mob = new Mobs(id, randomInt(25, stage.loop * 20), 128, 128, stage);
    mob.speed = randomInt(1, randomInt(0.1, stage.loop + 1));
    if (mob.speed > 7){
      mob.speed = 7;
    }
    mob.AI = {
      initial: [],
      repeat: []
    }
    let repeatAICount = randomInt(0, Math.floor(stage.loop)) + 3;
    if (id === 4){
      mob.health *= 1.5;
      repeatAICount *= 2;
    }
    for (let j = 0; j < repeatAICount; j ++){
      let ai = possibleAI[randomInt(0, possibleAI.length)];
      if (ai === "attack"){
        mob.AI.repeat = mob.AI.repeat.concat(AIPack.attack);
        let waitTime = randomInt(1000 - stage.loop * 100, 1000);
        if (waitTime < 100){
          waitTime = 100;
        }
        mob.AI.repeat[mob.AI.repeat.length - 2] = "wait" + waitTime;
      }else if (ai === "rangedAttack"){
        let attackTime = randomInt(1, stage.loop * 5);
        mob.AI.repeat = mob.AI.repeat.concat(AIPack.rangedAttack);
        mob.AI.repeat[mob.AI.repeat.length - 1] = "rangedAttack" + attackTime;
      }else if (ai === "heal"){
        let attackTime = randomInt(1, stage.loop * 0.2);
        mob.AI.repeat = mob.AI.repeat.concat(AIPack.heal);
        mob.AI.repeat[mob.AI.repeat.length - 1] = "heal" + attackTime/20;
      }else if (ai === "summon"){
        mob.AI.repeat = mob.AI.repeat.concat(AIPack.summon);
        let waitTime = randomInt(2000 - stage.loop * 100, 2000);
        if (waitTime < 200){
          waitTime = 200;
        }
        mob.AI.repeat[mob.AI.repeat.length - 1] = "wait" + waitTime;
      }
    }
    mob.jumpTo(randomInt(width / 2, width), randomInt(0, height));
  }
});

let currentStage;


let mainChar;

function cleanseProjectile(){
  for (let i = 0; i < objectList.length; i ++) {
    let object = objectList[i];
    if (object.isProjectile){
      object.destroySelf();
      i --
    }
  }
}

function initGame(isHard, isInfinite){
  if (currentStage){
    currentStage.enemyList = [];
  }
  pause();
  if (!isInfinite){
    objectList = [];
    currentStage = stage1;
    stage1.startStage();
    mainChar = new Main(0, 100, 128, 128);
    mainChar.jumpTo(50, 250);
    changeBackground();
    if (isHard){
      mainChar.hp = 1;
    }
  }else{
    if (mainChar.hp <= 0){
      mainChar.hp = mainChar.maxhp;
    }
    objectList = [mainChar];
    currentStage = infiniteStage;
    infiniteStage.loop = 1;
    dialogueController.container.hide();
    dialogueController.queue = [];
    infiniteStage.startStage();
    mainChar.jumpTo(50, 250);
  }
  render();
}

function loop(){
  handleKeys();
  handleMoveFrames();
  render();
}

function pause(){
  clearInterval(interval);
  interval = undefined;
}

function play(){
  $("#pause").hide();
  $("#resume").hide();
  $("#restart").hide();
  $(".restartHard").hide();
  $(".infiniteMode").hide();
  $("#quit").hide();
  $("#gameOver").hide();
  if (interval === undefined){
    interval = setInterval(loop, 1000 / fps);
  }
}

function pauseUI(){
  $("#pause").show();
  $("#resume").show();
  $("#restart").show();
  $(".restartHard").show();
  $(".infiniteMode").show();
  $("#quit").show();
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min) ) + min;
}

$("#restart").click(function(){
  initGame();
});
                    
$(".restartHard").click(function(){
  initGame(true);
  $("#pause").hide();
  $("#resume").hide();
  $("#restart").hide();
  $(".restartHard").hide();
  $("#quit").hide();
  $("#gameOver").hide();
  $(".infiniteMode").hide();
});

$(".infiniteMode").click(function(){
  initGame(true, true);
  $("#pause").hide();
  $("#resume").hide();
  $("#restart").hide();
  $(".restartHard").hide();
  $(".infiniteMode").hide();
  $("#quit").hide();
  $("#gameOver").hide();
  play()
});

$("#resume").click(function(){
  game = true
  play();
});
                   
$(document).keyup(function(e) {
  if (e.which === 27 && game === true) {
    pause();
    pauseUI();
    game = false;
  } else if (e.which === 27 && game === false) {
    play();
    game = true;
  }
});

let backgroundImages = ["url(https://cdn.gamedevmarket.net/wp-content/uploads/20191203145249/4779a7547f510ddb98a89edda4df3c78.png)", 
                       "url(https://cdn.gamedevmarket.net/wp-content/uploads/20191203145257/360a9179134324db09f345ef1c8f98b2-700x400.png)",
                       "url(https://c4.wallpaperflare.com/wallpaper/865/102/489/video-games-nature-river-fantasy-art-wallpaper-preview.jpg)",
                        "url(https://i.imgur.com/P3UPB1H.jpg)",
                       "url(https://image.freepik.com/free-vector/medieval-castle-throne-room-ballroom-interior-with-knights-armor-both-sides-king_33099-892.jpg)",
                        "url(https://i.imgur.com/o9C8FmJ.jpg)",
                       ];

function changeBackground(){
  if (currentStage === stage1){
    c.style.backgroundImage = backgroundImages[0];
  } else if (currentStage === stage2){
    c.style.backgroundImage = backgroundImages[1];
  } else if (currentStage === stage3){
    c.style.backgroundImage = backgroundImages[2];
  } else if (currentStage === stage4){
    c.style.backgroundImage = backgroundImages[3];
  } else if (currentStage === stage5){
    c.style.backgroundImage = backgroundImages[4];
  } else if (currentStage === stage6){
    c.style.backgroundImage = backgroundImages[5];
    $("#door").show();
    $("#clickDoor").show();
  }
}

changeBackground();

initGame();