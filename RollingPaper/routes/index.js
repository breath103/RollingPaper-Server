
module.exports = function(app){
    console.log("--ROUTES--");
    
    require("./api")(app);
    
    console.log("--ROUTES END--");
}