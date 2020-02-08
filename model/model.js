var db = require('../lib/db');


module.exports = {
    setModelMethods: setModelMethods
};

function setModelMethods(schemas) {
    var schemaNames = Object.keys(schemas);

    schemaNames.forEach(function(schemaName) {
        var schema = schemas[schemaName];
        schema.methods = schema.methods || {};
        schema.methods.load = function(cb) {
            var model = this;
            var query = "SELECT * FROM [" + schemaName + "] WHERE id=@id";
            var parameters = [{name:'id', dataType:db.dataTypes.Int, value:model.get(schema.key)}];
            db.executeSQL(query, parameters, cb);
        };
        schema.methods.save = function(cb) {
            var model = this, query;
            //TODO best way to get members and values. serialize??
            if (model.isNewUnsaved()) {
                query = "INSERT INTO "
            }
            else {
                query = "UPDATE"
            }
            //var parameters = [{name:'id', dataType:db.dataTypes.Int, model.get(schema.key)}];
            //db.executeSQL(query, parameters, cb);
        };
    });

}