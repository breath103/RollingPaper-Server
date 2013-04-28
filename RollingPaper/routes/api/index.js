s
/*
 * GET home page.
 */

module.exports = function(app){
    console.log("   --API--");

    require("./users")(app);
    
    console.log("   --API END--");
}