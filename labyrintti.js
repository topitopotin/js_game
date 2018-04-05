// Context and minimap context
var ctx;
var ctx_mm;

// Maximum thirst level. Playe will die if this is reached
var thirst_max = 200;
var starting_thirst = 15;

// Credits needed for graduation_credits
var graduation_credits = 240;

// Player object
var player={
	prev_x:0,
	prev_y:0,
    x:0,
    y:0,
    score:0,
    credits:0,
    thirst: starting_thirst
};

// Object spawning, minimum and maximum time before next spawn
var spawn_min_time = 10;
var spawn_max_time = 30;
var next_spawn = 0;
var spawn_at_init = 5; // Objects spawned during map gen

// Thirst gained from drinking
var thirst_gain = 60;

// Min and max random credit gain
var min_credit_gain = 2;
var max_credit_gain = 6;

// Message log
var msg_log = [];
var msg_log_max_length = 10; // Maximum number of allowed msg backlog

// Elapsed time in turns (one movement is one turn)
var elapsed_time = 0;

// Variable for storing map data
// 0 = empty square
// 1 = wall
// 2 = credits
// 3 = beer
var gameArea = [];

// Size of game area squares
var blockSize = 25;

// Size for minimap squares
var minimap_blockSize = 2;

// Game view window size
var gw_width = 20;
var gw_height = 20;

// Variables for map generation
var min_rooms = 8;
var max_rooms = 20; // Minimum and maximum amount of spawned rooms
var min_room_dim = 3;
var max_room_dim = 10; // Min and max room dimensions (both x, y)
var starting_items = 5; // Number of items to spawn during init
var max_pathways = 2; // Maximum pathways leading from one room to another

// Map size. Pixel size will be multiplied by blocksize
var map={
    width:60,
    height:60
};

// End game condition
var end = false;

var desired_pxl_width = 1280;
var desired_pxl_height = 720;

// **********************************************
// Communication functions **********************
// **********************************************

// Send SAVE request to parent
function send_save(){
  // Store gamestate
  var message = {
    "messageType": "SAVE",
	"gameState": {
        "player_x": player.x,
        "player_y": player.y,
        "player_score": player.score,
        "player_credits": player.credits,
        "player_thirst": player.thirst,
        "game_area": gameArea,
        "next_spawn": next_spawn,
        "elapsed_time": elapsed_time
        }
    };
    // Debug
    // document.getElementById("debug").innerHTML = JSON.stringify(message);
    window.parent.postMessage(message, "*");
    resetGameState();
}

// Send load request to parent
function send_load() {
    var message = {
        "messageType":"LOAD_REQUEST"
    };
    // Debug
    // document.getElementById("debug").innerHTML = JSON.stringify(message);
    window.parent.postMessage(message, "*");
}

// Send a score message to parent
function send_score() {
    var message = {
        "messageType": "SCORE",
        "score": player.score
    }
    // Debug
    // document.getElementById("debug").innerHTML = JSON.stringify(message);
    window.parent.postMessage(message, "*");
}

// Send settings message to parent
function send_setting() {
    var message = {
        "messageType": "SETTING",
        "options": {
            "width": desired_pxl_width,
            "height": desired_pxl_height
        }
    }
    window.parent.postMessage(message, "*");
}

// **********************************************
// Communication functions END*******************
// **********************************************

// Resets are game state variables to defaults
function resetGameState() {

	player.prev_x = 0;
	player.prev_y = 0;
    player.x = 0;
    player.y = 0;
    player.score = 0;
    player.credits = 0;
    player.thirst = starting_thirst;

    gameArea = [];
    msg_log = [];
    elapsed_time = 0;
    next_spawn = 0;

    clearMinimap();
}

// Save and quit function
function saveAndQuit() {
    send_save();
    resetGameState();

    document.getElementById("menu").style.display = "block";
    document.getElementById("game").style.display = "none";
}

// This is called when the player dies or ends the game deliberately
function endGame() {
    send_score();
    resetGameState();

    document.getElementById("menu").style.display = "block";
    document.getElementById("game").style.display = "none";
}



// Init function. Runs once at start when the document is loaded
$(document).ready(function(){
    $("#playArea").html("<canvas id='playAreaCanvas' style='border:1px solid #d3d3d3;'></canvas>");
    $("#minimap").html("<canvas id='minimapCanvas' style='border:1px solid #d3d3d3;'></canvas>");
    var ctrl_html = `
        <button id='savequit' onclick='saveAndQuit()'>Save & quit</button>
        <button id='endgame' onclick='endGame()'>End game</button>
    `;
    $("#controls").html(ctrl_html);
    var canvas = document.getElementById("playAreaCanvas");
    var mm_canvas = document.getElementById("minimapCanvas");

    // Canvas is used to draw game view
    canvas.width = gw_width * blockSize;
    canvas.height = gw_height * blockSize;
    ctx = canvas.getContext("2d");

    // Same as above for minimap
    mm_canvas.width = map.width * minimap_blockSize;
    mm_canvas.height = map.height * minimap_blockSize;
    ctx_mm = mm_canvas.getContext("2d");

    // Send settings to parent
    send_setting();

    document.getElementById("menu").style.display = "block";
    document.getElementById("game").style.display = "none";

    var html = `
				<h1>Life of a teekkari</h1>
				<p>
					<span style="color: red;">You</span> are lost in the campus and you must collect <span style="color: blue;">study credits</span> to graduate!<br>
					To survive in campus you must have a <span style="color: orange;">drink</span> every now and then.<br>
					There are <span style="color: orange;">bottles of cold beer</span> lying around the hallways.<br>
					Use  <span style="font-weight: bold;">W A S D</span>  to move around the campus.<br>
					Collect 240 <span style="color: blue;">study credits</span> to graduate and win the game.
				</p>
        <button id='newgame' onclick='gameStart()'>New Game</button>
        <button id='loadgame' onclick='send_load()'>Load Game</button>
    `;

    $("#menu").html(html);
    //$("#menu").html("<button id='loadgame' onclick='sendLoad()'>Load Game</button>");
});

// Game initialization
function gameStart() {
    if ( document.getElementById("savequit").disabled == true ) {
        document.getElementById("savequit").disabled = false;
    }
    end = false;
    generateGameArea();
    drawMinimap();

    // Randomize player position
    var pos = random_empty_square();
    player.prev_x = pos.x;
    player.prev_y = pos.y;
    player.x = pos.x;
    player.y = pos.y;

    document.getElementById("menu").style.display = "none";
    document.getElementById("game").style.display = "block";

    updateGameView(player.x, player.y);
    document.getElementById("messagebox").innerHTML = msgString();
    document.getElementById("status").innerHTML = statusString();
}

// Draw minimap. This is called only once. (Only walls are drawn)
function drawMinimap() {
    ctx_mm.fillStyle = "#000000";
    for (y = 0; y < map.height; y++) {
        for (x = 0; x < map.width; x++) {
            if ( gameArea[y*map.width + x] == 1 ) {
                ctx_mm.fillRect(x*minimap_blockSize, y*minimap_blockSize, minimap_blockSize, minimap_blockSize);
            }
        }
    }
}

// Clear drawn blocks
function clearGameView() {
    ctx.clearRect(0, 0, gw_width * blockSize, gw_height * blockSize);
}

// Clear minimap after game end
function clearMinimap() {
    ctx_mm.clearRect(0, 0, map.width * minimap_blockSize, map.height * minimap_blockSize);
}

// Update game view, centered on player position
function updateGameView(x, y) {
    clearGameView();

    // Define top left corner of game area to be drawn
    var top_left = {
        x: (x - Math.floor(gw_width / 2) ),
        y: (y - Math.floor(gw_height / 2) )
    }
    // Define bottom right corner of game area to be drawn
    var bottom_right = {
        x: (x + Math.floor(gw_width / 2) ),
        y: (y + Math.floor(gw_height / 2) )
    }
    if ( top_left.x < 0 ) {
        top_left.x = 0;
        bottom_right.x = gw_width-1;
    }
    if ( top_left.y < 0 ) {
        top_left.y = 0;
        bottom_right.y = gw_height-1;
    }
    if ( bottom_right.x >= map.width ) {
        top_left.x = map.width - gw_width;
        bottom_right.x = map.width - 1;
    }
    if ( bottom_right.y >= map.height ) {
        top_left.y = map.height - gw_height;
        bottom_right.y = map.height - 1;
    }

    // Draw
    var draw_x = 0;
    var draw_y = 0;

    for ( map_y = top_left.y; map_y <= bottom_right.y; map_y++ ) {
        draw_x = 0;
        for ( map_x = top_left.x; map_x <= bottom_right.x; map_x++ ) {
            var block = gameArea[map_y * map.width + map_x];
            // Check if player is in current square, else draw map block
            if (player.y == map_y && player.x == map_x) {
                ctx.fillStyle = "#FF0000";
                ctx.fillRect(draw_x*blockSize, draw_y*blockSize, blockSize, blockSize);
            } else if ( block == 1 ) {
                // Wall
                ctx.fillStyle = "#000000";
                ctx.fillRect(draw_x*blockSize, draw_y*blockSize, blockSize, blockSize);
            } else if ( block == 2 ) {
                // Credits
                ctx.fillStyle = "#0000FF";
                ctx.fillRect(draw_x*blockSize, draw_y*blockSize, blockSize, blockSize);
            } else if ( block == 3 ) {
                // Beer
                ctx.fillStyle = "#AAAA00";
                ctx.fillRect(draw_x*blockSize, draw_y*blockSize, blockSize, blockSize);
            }
            draw_x += 1;
        }
        draw_y += 1;
    }
}

function random_int(min, max) {
    return Math.floor( Math.random() * (max-min+1) + min )
}

// Spawn object in random empty square
// Type = 2 -> credits
// Type = 3 -> beer
function spawnObject() {
    var pos = random_empty_square();
    var type;
    if ( random_int(1, 10) % 2 == 0) {
            // Spawn credits
            type = 2;
        } else {
            // Spawn beer
            type = 3;
        }
    gameArea[pos.y * map.width + pos.x] = type;
    var message;
    if (type == 2) {
        message = "Credits available at coordinates " + pos.x + ", " + pos.y + "!";
    } else {
        message = "Beer available at coordinates " + pos.x + ", " + pos.y + "!";
    }
    addMessage(message);
}

// Consume object from given coordinates
function consumeObject(x, y) {
    var type = gameArea[y * map.width + x];

    if ( type == 2 ) {
        // Consume credits
        var gain = random_int(min_credit_gain, max_credit_gain);
        gameArea[y * map.width + x] = 0;
        player.credits += gain;
        player.score += Math.floor(gain*(thirst_max-player.thirst));
        addMessage("You complete a part of your studies and gain " + gain.toString() + " credits!");
    } else if ( type == 3 ) {
        // Consume beer
        gameArea[y * map.width + x] = 0;
        addMessage("You quench your thirst with delicious beer!");
        if (player.thirst < thirst_gain) {
            player.thirst = 0;
        } else {
            player.thirst -= thirst_gain;
        }
    }
}

function generateGameArea() {
    var room_num = random_int(min_rooms, max_rooms);

    var rooms = []

    // Initialize gameArea with ones (walls)
    for ( i = 0; i < map.height * map.width; i++ ) {
        gameArea.push(1);
    }

    // Randomize rooms
    for ( i = 0; i < room_num; i++ ) {
        var room = {
            x: random_int(0, map.width - 1),
            y: random_int(0, map.height - 1),
            dim_x: random_int(min_room_dim, max_room_dim),
            dim_y: random_int(min_room_dim, max_room_dim)
        }
        // Check if room fits inside play area
        // Room creation starts from room top left corner
        if ( room.x + room.dim_x > map.width - 1 ) {
            room.x = (map.width - 1) - room.dim_x;
        }
        if ( room.y + room.dim_y > map.height - 1 ) {
            room.y = (map.height - 1) - room.dim_y;
        }
        rooms.push(room)
    }

    // Carve rooms into map by replacing walls (1) with empty space (0)
    for (i = 0; i < rooms.length; i++ ) {
        for(y = rooms[i].y; y < rooms[i].y + rooms[i].dim_y; y++) {
            for(x = rooms[i].x; x < rooms[i].x + rooms[i].dim_x; x++) {
                gameArea[y*map.width + x] = 0;
            }
        }
    }

    // Carve pathways from one room to another
    var x_first = true;
    for (i = 0; i < rooms.length; i++) {
        pw = random_int(1, max_pathways);
        for (p = 1; p <= pw; p++) {
            // Start at roughly center of room
            var path_x_start = rooms[i].x + Math.floor(rooms[i].dim_x / 2);
            var path_y_start = rooms[i].y + Math.floor(rooms[i].dim_y / 2);
            var path_x_end = 0;
            var path_y_end = 0;
            // Select target room
            if ( i + p >= rooms.length ) {
                path_x_end = rooms[(i+p)-rooms.length].x + Math.floor(rooms[(i+p)-rooms.length].dim_x / 2);
                path_y_end = rooms[(i+p)-rooms.length].y + Math.floor(rooms[(i+p)-rooms.length].dim_y / 2);
            } else {
                path_x_end = rooms[i+p].x + Math.floor(rooms[i+p].dim_x / 2);
                path_y_end = rooms[i+p].y + Math.floor(rooms[i+p].dim_y / 2);
            }

            var x_increment = 1;
            var y_increment = 1;
            if ( path_x_start > path_x_end ) {
                x_increment = -1;
            }
            if ( path_y_start > path_y_end ) {
                y_increment = -1;
            }

            var carve_x = path_x_start;
            var carve_y = path_y_start;

            // Carve path
            if( x_first ) {

                while( carve_x != path_x_end ) {
                    gameArea[carve_y*map.width+carve_x] = 0;
                    carve_x += x_increment;
                }
                while( carve_y != path_y_end ) {
                    gameArea[carve_y*map.width+carve_x] = 0;
                    carve_y += y_increment;
                }
            } else {
                while( carve_y != path_y_end ) {
                    gameArea[carve_y*map.width+carve_x] = 0;
                    carve_y += y_increment;
                }
                while( carve_x != path_x_end ) {
                    gameArea[carve_y*map.width+carve_x] = 0;
                    carve_x += x_increment;
                }
            }
        }
    }

    // Spawn initial objects
    for (s = 0; s < spawn_at_init; s++) {
        spawnObject();
    }

    // Set next spawn
    next_spawn = elapsed_time + random_int(spawn_min_time, spawn_max_time);
}

// Returns coordintates for random empty square
function random_empty_square() {
    // Loop this until a proper square is found
    while(true) {
        var pos = {
            x: random_int(0, map.width-1),
            y: random_int(0, map.height-1)
        };

        var orig = pos;

        if ( gameArea[pos.y*map.width+pos.x] == 0 ) {
            // Initial guess was empty
            return pos
        } else {
            if ( pos.x % 2 == 0 ) {
                // x is even, look right
                while (pos.x < map.width) {
                    if ( gameArea[pos.y*map.width+pos.x] == 0 ) {
                        return pos;
                    }
                    pos.x += 1;
                }
            } else {
                while (pos.x > -1) {
                    if ( gameArea[pos.y*map.width+pos.x] == 0 ) {
                        return pos;
                    }
                    pos.x -= 1;
                }
            }
            // Empty square was not found on x-axis. Restore original position
            pos = orig;
            if ( pos.y % 2 == 0 ) {
                // y is even, look down
                while (pos.y < map.height) {
                    if ( gameArea[pos.y*map.width+pos.x] == 0 ) {
                        return pos;
                    }
                    pos.y += 1;
                }
            } else {
                while (pos.y > -1) {
                    if ( gameArea[pos.y*map.width+pos.x] == 0 ) {
                        return pos;
                    }
                    pos.y -= 1;
                }
            }
        }
    }
}

function isWall(x, y) {
    if ( gameArea[y * map.width + x] == 1 ) {
        return true;
    } else {
        return false;
    }
}

function updatePlayerPos(x, y) {
	var new_x = player.x + x;
    var new_y = player.y + y;

    // Check for out of bounds
	if(new_x >= 0 && new_x < map.width){
		if ( !isWall(new_x, new_y) ) {
            player.prev_x = player.x;
            player.x += x;
        }
    }
    if(new_y >= 0 && new_y < map.height){
		if ( !isWall(new_x, new_y) ) {
            player.prev_y = player.y;
            player.y += y;
        }
    }

    // Check if player is standing over an items
    var type = gameArea[player.y * map.width + player.x];
    if ( type == 2 || type == 3 ) {
        consumeObject(player.x, player.y);
    }
}

// Generate message string from message log
function msgString() {
    var output = "";

    for (i = 0; i < msg_log.length; i++) {
         output = output.concat(msg_log[i].concat("<br>"));
    }

    return output;
}

// Print player status
function statusString() {
    var output = "";
    var thirst = "";

    // Check different thirst levels
    if ( player.thirst / thirst_max > 0.95 ) {
        thirst = "You are dying from thirst!";
    } else if ( player.thirst / thirst_max > 0.90 ) {
        thirst = "You are extremely dehydrated!";
    } else if ( player.thirst / thirst_max > 0.75 ) {
        thirst = "You are seriously thirsty!";
    } else if ( player.thirst / thirst_max > 0.50 ) {
        thirst = "You are quite thirsty";
    } else if ( player.thirst / thirst_max > 0.25 ) {
        thirst = "You are slightly thirsty";
    } else if ( player.thirst / thirst_max > 0.05 ) {
        thirst = "Your thirst is satiated";
    } else {
        thirst = "You are bloated with beer!";
    }

    output = output.concat("Current credits: " + player.credits.toString() + "<br>");
    output = output.concat(thirst + "<br>");
    output = output.concat("Current time: " + elapsed_time.toString() + "<br>");
    output = output.concat("Score: " + player.score.toString() + "<br>");

    return output;
}

// Adds a new message to the message log and purges old ones
function addMessage(new_msg) {
    msg_log.push(new_msg);
    if (msg_log.length >= msg_log_max_length) {
        msg_log.shift();
    }
}

// Capture keypresses
function keyPressFunction(event){
    var x = event.which || event.keyCode;
    var valid_input = false;

    // Disable controls if end condition
    if(!end) {
        if(x === 119){  // w is pressed
            updatePlayerPos(0, -1);
            valid_input = true;
        } else if(x === 100){ // d is pressed
            updatePlayerPos(1, 0);
            valid_input = true;
        } else if(x === 115){ // s is pressed
            updatePlayerPos(0, 1);
            valid_input = true;
        } else if(x === 97){ // a is pressed
            updatePlayerPos(-1, 0);
            valid_input = true;
        }
    }
    if (valid_input && !end) {
        elapsed_time += 1;
        player.thirst += 1;
    }

    if (player.thirst >= thirst_max && valid_input && !end) {
        // Player dies from thirst
        player.score += player.credits * 100 - elapsed_time;
        addMessage("You die from thirst! Ending score: " + player.score.toString());
        end = true;
    }
    
    if (player.credits >= graduation_credits && valid_input && !end) {
        // Player wins the game!
        player.score += player.credits * 100 - elapsed_time;
        addMessage("You graduate with " + player.credits.toString() + " credits! Ending score: " + player.score.toString());
        end = true;
    }

    if ( next_spawn <= elapsed_time && valid_input && !end) {
        spawnObject();
        next_spawn = elapsed_time + random_int(spawn_min_time, spawn_max_time);
    }
    updateGameView(player.x, player.y);
    //addMessage(elapsed_time.toString());
    //drawPlayer();

    document.getElementById("messagebox").innerHTML = msgString();
    document.getElementById("status").innerHTML = statusString();
    //document.getElementById("debug").innerHTML = "player position: " + player.x + ", " + player.y + " thirst: " + player.thirst;
    //document.getElementById("debug").innerHTML = "random: " + random_int(min_rooms, max_rooms);

    //var dbg = random_empty_square();
    //document.getElementById("debug").innerHTML = "random empty square: " + dbg.x + ", " + dbg.y;

    // Disable save button if end condition
    if ( end ) {
        document.getElementById("savequit").disabled = true;
    }
}

// Event handler for messages from parent
window.addEventListener("message", function(event) {
	if( typeof(event) != undefined ) {
		// Handlers for different messages
		if(event.data.messageType == "LOAD") {
			// LOAD event
			// Fill gamestate variables with data
			// supplied with the message
            gameArea = event.data.gameState.game_area;
            player.x = event.data.gameState.player_x;
            player.y = event.data.gameState.player_y;
            player.score = event.data.gameState.player_score;
            player.credits = event.data.gameState.player_credits;
            player.thirst = event.data.gameState.player_thirst;
            next_spawn = event.data.gameState.next_spawn;
            elapsed_time = event.data.gameState.elapsed_time;

            addMessage("Game loaded! Welcome back!");

            // Run some startup funcs
            clearGameView();
            drawMinimap();

            // Switch game visibility
            document.getElementById("menu").style.display = "none";
            document.getElementById("game").style.display = "block";

		} else if (event.data.messageType == "ERROR") {
            window.alert(event.data.info);
        }
	} else {
		// Undefined event
	}
});
