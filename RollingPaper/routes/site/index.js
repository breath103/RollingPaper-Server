var fs = require("fs");

module.exports = function(app){
    console.log("   --SITES--");
    
    app.get("/",function(req,res){
        res.render("FBdiary",{
            title : "RollingPaper"
        }); 
    });

    require("./admin")(app);
    require("./auth")(app);
    require("./users")(app);
    require("./contents")(app);

    console.log("   --SITES END--");
};