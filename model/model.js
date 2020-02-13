var db = require('../lib/db');


module.exports = {
    setModelMethods: setModelMethods
};

function setModelMethods(schemas, og) {
    var schemaNames = Object.keys(schemas);

    schemaNames.forEach(function(schemaName) {
        var schema = schemas[schemaName];
        schema.methods = schema.methods || {};
        schema.collectionMethods = schema.collectionMethods || {};
        schema.methods.membersArray = function() {
            var model=this, members=[];
            Object.keys(schema.members).forEach(function(memberName) {
                var member = schema.members[memberName];
                if (memberName!==schema.key) {
                    if (member.type && member.key) members.push(member.key);
                    else members.push(member);
                }
            });
            return members;
        };
        schema.methods.valuesArray = function() {
            var model=this, values=[];
            Object.keys(schema.members).forEach(function(memberName) {
                var member = schema.members[memberName];
                if (memberName!==schema.key) {
                    if (member==="string") values.push("'"+model.get(memberName)+"'");
                    else if (member==="date") values.push(model.get(memberName).getTime());
                    else if (member==="boolean") values.push(model.get(memberName)?1:0);
                    else if (member==="long") values.push(model.get(memberName));
                    else if (member.type && member.key) {
                        var child=model.get(memberName);
                        values.push(child.get(child.schema.key));
                    }
                    else values.push(null);
                }
            });
            return values
        };
        schema.methods.getValueForSQL = function(memberName) {
            var model=this, member = schema.members[memberName], value=model.get(memberName);
            if (member==="string") return value && "'"+value+"'" || null;
            else if (member==="date") return value ? value.getTime() : null;
            else if (member==="boolean") return value?1:0;
            else if (member==="long") return value || null;
            else if (member.key) return value && value.get(value.schema.key) || null;
            else return null;
        };
        schema.methods.load = function(cb) {
            var model = this;
            var query = "SELECT * FROM [" + schema.plural + "] WHERE "+schema.key+"=@key";
            var parameters = [{name:'key', dataType:db.dataTypes.Int, value:model.get(schema.key)}];
            db.executeSQL(query, parameters, function(err, rows) {
                if (err) cb(err);
                og.add(schema.type, rows[0]);
                //TODO need to loop through child objects and get those and build an object (maybe just do it manually for now??)
                cb();
            });

        };
        schema.methods.save = function(cb) {
            var model = this, childObjectsBeingSaved=0;
            var unsavedChanges = model.unsavedChanges();
            if (!unsavedChanges) return cb();
            var membersToSave=[];
            Object.keys(schema.members).forEach(function(key) {
                var member = this.schema.members[key], candidate;
                if (!member) return;
                if (key===schema.key) return;
                if (unsavedChanges[key]) {
                    candidate = model[key];
                    if (og.isCollection(candidate)) {
                        if (member.cascadeSave) {} //TODO save collection, may need to save after saving this model
                        //TODO How to know what to delete??
                    }
                    else if (member.cascadeSave) {membersToSave.push(key);saveChild(candidate);}
                    else membersToSave.push(key);
                }
                else if (member.type && member.key && unsavedChanges[member.key]) {
                    membersToSave.push(key);
                }
            }.bind(this));
            readyToSave();

            function saveChild(candidate) {
                if (!candidate.isNewUnsaved() && !candidate.unsavedChanges()) return;
                childObjectsBeingSaved++;
                candidate.save(function() {
                    childObjectsBeingSaved--;
                    readyToSave();
                });
            }
            function readyToSave() {
                var query, parameters;
                //TODO need to account for SQL injection
                if (childObjectsBeingSaved===0) {
                    if (model.isNewUnsaved()) {
                        query = "INSERT INTO ["+schema.plural+"] (";
                        query+=membersToSave.map(function(memberName) {
                           return schema.members[memberName].key || memberName;
                        }).join(',');
                        query+=") VALUES (";
                        query+=membersToSave.map(function(memberName) {
                            return model.getValueForSQL(memberName)
                        });
                        query+="); select @@identity as "+schema.key;
                    }
                    else {
                        query = "UPDATE ["+schema.plural+"] SET ";
                        query+=membersToSave.map(function(memberName) {
                            var column = schema.members[memberName].key || memberName;
                            var value = model.getValueForSQL(memberName);
                            return column+"="+value;
                        }).join(',');
                        query+=" WHERE "+schema.key+"=@key";
                        parameters = [{name:'key', dataType:db.dataTypes.Int, value:model.get(schema.key)}];
                    }
                    db.executeSQL(query, parameters, function(err, rows) {
                        if (err) cb(err);
                        model.applyUnsavedChanges(rows[0]);
                        cb();
                    });
                }
            }


            /*Object.keys(this._data).forEach(function(key) {
                var member = this.schema.members[key];
                if (!member) return;
                var candidate = this.get(key);
                if (og.isCollection(candidate)) {
                    //TODO need way of knowing if something needs to be deleted (mark as deleted somehow??) Only if parent is unsaved
                    if (member.cascadeSave) saveChild(candidate, key);
                }
                else if (member.type) {
                    if (member.cascadeSave) {
                        if (og.isModel(candidate)) saveChild(candidate, key);
                    }
                    else if (member.key) {
                        // include the key unless it refers to the parent that called serialize on this model
                        if (candidate !== parent) {
                            if (og.isModel(candidate)) saveChild(candidate, key);
                        }
                    }
                }
            }.bind(this));*/

            /*function saveChild(candidate, key) {
                childObjectsBeingSaved++;
                candidate.save(function() {
                   childObjectsBeingSaved--;
                   model[key] = candidate;
                   readyToSave();
                });
            }
            function readyToSave() {
                var query, parameters;
                var membersArray=model.membersArray(), valuesArray=model.valuesArray();
                if (childObjectsBeingSaved===0) {
                    if (model.isNewUnsaved()) {
                        //TODO need to account for SQL injection
                        query = "INSERT INTO ["+schema.plural+"] ("+membersArray.join(',')+") VALUES ("+valuesArray.join(',')+")";
                    }
                    else {
                        query = "UPDATE ["+schema.plural+"] SET ";
                        var memberValuePairs=[];
                        membersArray.forEach(function(member, index) {
                           memberValuePairs.push(member+"="+valuesArray[index]);
                        });
                        query+=memberValuePairs.join(',')+" WHERE "+schema.key+"=@key";
                        parameters = [{name:'key', dataType:db.dataTypes.Int, value:model.get(schema.key)}];
                    }
                    db.executeSQL(query, parameters, function(err, rows) {
                        if (err) cb(err);
                        model.applyUnsavedChanges(rows[0]);
                        cb();
                    });
                }
            }*/
        };
        schema.collectionMethods.load=function(){};
        schema.collectionMethods.save=function(){};
    });

}