var http 	 = require('http');
var express  = require('express');
var app      = express();
var socketIO = require('socket.io');
var io 		 = null;
var fs   	 = require('fs');
var path 	 = require("path");
var url  	 = require("url");
var net  	 = require("net");
var async    = require('async');
var vm 		 = require('vm');

function initExpressEndSocketIO(){
		app.configure(function() {
		app.set('views', __dirname + '/views');
		app.set('view options', { layout: false });
		app.set('view engine', 'ejs');
		app.use(express.methodOverride());
		app.use(express.bodyParser());
		app.use(express.static(__dirname + '/resources'));
		app.use(app.router);
		
	});
	app.configure('production', function() {
	    app.use(express.logger());
	    app.use(express.errorHandler());      
	});
	app.configure('development', function() {
	    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
	});
	app.get('/', function(req, res) {
	    res.render('index.html', {});      
	});
	app.get('/test', function(req, res) {
	    res.render('map.ejs', {});      
	});
	app.get('/game/view.html', function(req, res) {
	    res.render('view.html', {});      
	});
	app.get('/game/client.html', function(req, res) {
	    res.render('client.html', {});      
	});
	app = http.createServer(app).listen(8001);
	io = socketIO.listen(app);
}
initExpressEndSocketIO();


Array.prototype.remove = function(o){
	this.splice(this.indexOf(o), 1);
};


var viewClients = [];
net.createServer(function(socket) {
	socket.on("connect", function() {
		viewClients.push(socket);
		console.log("corrent tcp/ip clients",viewClients.length);
	});
	socket.on("close", function() {
		viewClients.remove(socket);
	});
	socket.on("data", function(data) {
		console.log("tcp : "+data);
	});
}).listen(7777,"0.0.0.0");



io.sockets.on('connection', function (socket) {
	socket.on('message', function (data) {
        console.info(data);
    });
    
    var deviceMotionSendCheck = 0;
    socket.on("deviceMotion",function(data){
    	console.log(deviceMotionSendCheck++);
    
    	data.id = socket.id ;
    	viewClients.forEach(function(client) {
	    	client.write( JSON.stringify({type:"deviceMotion",data:data}) +"\r\n");
	    })
    });
    socket.on("paintStart",function(data){
    	data.id = socket.id;
    	
    	viewClients.forEach(function(client) {
	    	client.write( JSON.stringify({type:"paintStart",data:data}) +"\r\n");
	    })
    });
    socket.on("paintEnd",function(data){
    	viewClients.forEach(function(client) {
	    	client.write( JSON.stringify({type:"paintEnd",data:{ id : socket.id }}) +"\r\n");
	    })
    });
    
    socket.on("shutdown",function(data){
    	process.exit(0);
    });
    
    socket.on('disconnect', function () {
	});
});






