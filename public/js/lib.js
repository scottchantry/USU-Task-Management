"use strict";

function ObjectGraph() {
    var og, schemata={};
    function OG() {}
    OG.prototype = {
        constructor: ObjectGraph,
        addSchemata: function(schemataSrc, cb) {
            if (!schemataSrc.members) {
                Object.keys(schemataSrc).forEach(function(key){
                    schemataSrc[key].type=key;
                    addSchema(schemataSrc[key]);
                });
            }
            else addSchema(schemataSrc);
            function addSchema(schemaSrc) {
                var schema;
                if (!schemata[schemaSrc.type]) {
                    // schema doesn't exist yet, add it.
                    schema = {type:schemaSrc.type, name:schemaSrc.name, plural:schemaSrc.plural, key:schemaSrc.key, members:schemaSrc.members, onSet:schemaSrc.onSet, onSave:schemaSrc.onSave, collectionEvents:schemaSrc.collectionEvents, fullSave:schemaSrc.fullSave, shallowSave:schemaSrc.shallowSave, incremental:schemaSrc.incremental, bubbleEvents:schemaSrc.bubbleEvents, recOfArrays:schemaSrc.recOfArrays};
                    schema.proto = Object.create(Model.prototype);
                    schema.proto.constructor = Model;
                    schema.collectionProto = Object.create(Collection.prototype);
                    schema.collectionProto.schema = schema;
                    schema.collectionProto.constructor = Collection;
                    schema.constructor = Schema;
                    schemata[schemaSrc.type] = schema;
                    og[schemaSrc.type] = schema;
                    if (schemaSrc.plural) {
                        schemata[schemaSrc.plural] = schema;
                        og[schemaSrc.plural] = new Collection([], schema);
                    }
                    Object.keys(schemaSrc.members).forEach(function(memberName) {
                        Object.defineProperty(schema.proto, memberName, {
                            get: function() {return this.get(memberName)},
                            set: function(value) {this.set(memberName, value)}
                        });
                    });
                }
                else schema = schemata[schemaSrc.type]; // may modify methods after initial creation
                if (schemaSrc.methods) $.extend(schema.proto, schema.methods=schemaSrc.methods);
                if (schemaSrc.collectionMethods) $.extend(schema.collectionProto, schemaSrc.collectionMethods);
            }
            if (cb) cb();
            function Schema() {}// placeholder constructor
        },
        add: function instantiate(type, src, cb) {
            var args = Array.prototype.slice.call(arguments), count, keys;
            if (args[args.length-1] instanceof Function) cb = args.pop();
            if (args.length === 2) {
                type = args[0];
                src = args[1];
            }
            else {
                var obj={};
                src = args[0];
                keys=og.keys();
                count=keys.length;
                keys.forEach(function(key) {
                    var source=src[key];
                    if (source) {
                        if (switchable(source)) source = switchRecordArray(source);
                        obj[key] = instantiate(key, source, function() {
                            if ((count-=1)===0 && cb) setImmediate(function(){cb(obj)});
                        });
                    }
                    else if ((count-=1)===0 && cb) cb(obj);
                });
                return obj;
            }
            // instantiate new model(s) from src
            var collection, model, schema=schemata[type], membersPostProcess=[];
            if (Array.isArray(src)) {
                // each model in the array
                count=src.length;
                collection = new Collection([], schema);
                if (schema.incremental) {
                    setImmediate(function() {src.forEach(function(one) {collection.add(instantiate(type, one))})});
                }
                else {
                    src.forEach(function(one) {
                        collection.add(instantiate(type, one, function() {if ((count-=1)===0 && cb) setImmediate(function(){cb(collection)})}));
                    });
                }
                if ((schema.incremental || src.length===0) && cb) cb(collection);
                return collection;
            }
            else if (schema.key && (model = og[schema.plural].by(src[schema.key]))) {
                // look up object in OG
                keys = Object.keys(src);
                Object.keys(schema.members).forEach(function(key) {if (keys.indexOf(key)<0) keys.push(key)});
                keys.forEach(function(memberName) {
                    matchUp(memberName);
                    if (src[memberName]!==undefined) model._set(memberName, src[memberName]);
                });
                membersPostProcess.forEach(function(postProcess) {postProcess()});
                if (cb) cb(model);
                return model;
            }
            else {
                model = Object.create(schema.proto);
                // pre-formatting, & pre-process inline member collections and models
                if (schema.members) Object.keys(schema.members).forEach(matchUp);
                Model.call(model, schema, src); // augment model
                // add to object graph
                og[schema.plural].add(model);
                // link up relationships now that model is an instance of Model
                membersPostProcess.forEach(function(postProcess) {postProcess()});
                if (cb) cb(model);
                return model;
            }
            function matchUp(memberName) {
                var memberDef=schema.members[memberName], child, source, childCollection, backReference = schema.type;
                if (!memberDef) return;
                if (memberDef === 'date' && src[memberName]!=null) src[memberName] = new Date(src[memberName]);
                else if (src[memberName] && og.isModel(src[memberName])) {
                    // all set, do nothing
                }
                else if (memberDef.type && src[memberName]) {
                    // instantiate child models
                    source=src[memberName];
                    child = instantiate(memberDef.type, source);
                    child._set(type, model);
                    child.subscribe(undefined, false, function(key) {
                        if (key) model.publish(memberName);
                    });
                    src[memberName] = child;
                }
                else if (memberDef.plural) {
                    // instantiate child collections
                    source=src[memberName];
                    if (source) {
                        if (source[0] && typeof source[0]==='object') source.forEach(function(childSrc) {childSrc[backReference]=model});
                        childCollection = instantiate(memberDef.plural, source);
                    }
                    src[memberName] = childCollection;
                    // else TODO this else gets called too often
                }
                else if (memberName==='id' && !schema.key) schema.key='id';
                else if (memberDef.type && memberDef.key) {
                    membersPostProcess.push(function(){
                        var foreignKey=memberDef.key;
                        var memberSchema = schemata[memberDef.type];
                        var foreignKeyValue = model.get(foreignKey);
                        if (foreignKeyValue) {
                            var otherModel = og[memberSchema.plural].by(foreignKeyValue);
                            if (!otherModel) {
                                var otherModelSrc={};
                                otherModelSrc[memberSchema.key] = foreignKeyValue;
                                otherModel = instantiate(memberDef.type, otherModelSrc);
                            }
                            model._set(memberName, otherModel);
                            if (schema.members[memberName].include || schema.members[memberName].reference) {
                                otherModel.subscribe(undefined, false, function(key) {
                                    if (key) model.publish(memberName);
                                })
                            }
                        }
                    });
                }
                else if (typeof src==='string' && memberDef==='string') {
                    source=src;
                    src={};
                    src[memberName]=source;
                }
            }
        },
        isModel: function(candidate) {
            return candidate instanceof Model;
        },
        isCollection: function(candidate) {
            return candidate instanceof Collection;
        },
        keys: function() {
            var arr=[];
            Object.keys(schemata).forEach(function(key) {if (og[key]) arr.push(key)});
            return arr;
        },
        Collection: Collection
    };
    og = new OG();

    function Model(schema, attr) {
        var model=this;
        this.reset();
        this.schema = schema;
        this.constructor=Model;
        if (attr) {
            Object.keys(attr).forEach(function (key) {
                model._set(key, attr[key]);
            });
        }
    }
    Model.prototype = {
        constructor:Model,
        reset: function() {
            this._data = {};
            this.length = 0;
            //this.emit('reset');
        },
        get: function(key, arg) {
            //arg as true is used to return the compare object.
            var val, type;
            if (key===undefined) return undefined;
            if (Array.isArray(key)) {
                var keys=key;
                val=this;
                // traverse the object graph for each key
                keys.forEach(function(k) {
                    if (val) {
                        if (parseInt(k, 10) === k) {
                            if (val.at) val = val.at(k);
                        }
                        else if (val.get) val = val.get(k);
                    }
                });
                return val;
            }
            else if (this.schema.methods && this.schema.methods[key]) return this[key](arg);
            else if ((val = this._data[key]) || val === null || val === '' || val === false || val === 0) return val;
            else if ((type=this.schema.members[key])) {
                if (type.plural) {
                    val = this._data[key] = new og.Collection([], og[type.plural].schema);
                    return val;
                }
            }
            else return undefined;
        },
        set: function(key, value) {
            if (key === undefined) throw (Error("Value for key is required."));
            var self = this, attr, oldValue, member;
            if (arguments.length === 1 && key === Object(key)) {
                attr = key;
                Object.keys(attr).forEach(function(k) {
                    self.set(k, attr[k]);
                });
            }
            else if (value !== null && value === Object(value) && !og.isModel(value)) {
                attr = value;
                if (!og.isModel(this[key])) return this;
                Object.keys(attr).forEach(function(k) {
                    self[key].set(k, attr[k]);
                });
            }
            else {
                if (!this._data.hasOwnProperty(key)) this.length++;
                member = this.schema.members[key];
                oldValue = this.get(key);
                if (member==='date') {
                    value = (value===null||value===undefined) ? value : new Date(value);
                    if (oldValue && value && oldValue.getTime && value.getTime && value.getTime()===oldValue.getTime()) value = oldValue; // handle same date
                }
                else if (member==='long') value = (value===null||value===undefined) ? value : parseInt(value, 10);
                else if (member==='boolean') value = !!value;
                else if (member==='string') value = (value===null||value===undefined) ? value : ''+value;
                //else if (value!==null && (!og.isModel(value) || value.schema.type !== member)) console.warn("Value of type "+value.schema.type+" does not match schema "+this.schema.members[key]+" for "+this.schema.type+"."+key);
                if (oldValue !== value) {
                    if (this.schema.onSet && this.schema.onSet[key]) {
                        this._data[key] = this.schema.onSet[key].call(this, value, oldValue);
                    }
                    else this._data[key] = value;
                    if (member) {
                        if (!this._unsaved) this._unsaved = {};
                        if (value === this._unsaved[key]) delete this._unsaved[key];
                        else if (!this._unsaved.hasOwnProperty(key)) this._unsaved[key] = oldValue;
                        var reciprocal = member && member.reciprocal;
                        if (reciprocal) {
                            if (value && og.isModel(value) && og.isCollection(value.get(reciprocal))) {
                                value.get(reciprocal).add(this);
                            }
                            if (og.isModel(oldValue)) {
                                oldValue.get(reciprocal).remove(this);
                            }
                        }
                        this.publish(key, value, oldValue);
                        if (member.publish && reciprocal) {
                            if (og.isModel(value)) value.publish(reciprocal);
                            if (og.isModel(oldValue)) oldValue.publish(reciprocal);
                        }
                    }
                }
            }
            return this;
        },
        _set: function(key, value) {
            var reciprocal, collection, member=this.schema.members[key], oldValue;
            if (member) {
                reciprocal = member.reciprocal;
                if (reciprocal && og.isModel(value) && value._data) {
                    collection = value._data[reciprocal];
                    if (!collection) {
                        collection = new Collection([], this.schema);
                        value._set(reciprocal, collection);
                        collection.add(this);
                    }
                    else if (collection && !collection.has(this)) collection.add(this);
                }
                if (member==='date') {
                    value = (value===null||value===undefined||value instanceof Date) ? value : new Date(value);
                }
                else if (member==='long') value = (value===null||value===undefined) ? value : parseInt(value, 10);
                else if (member==='boolean') value = !!value;
                else if (member==='string') value = (value===null||value===undefined) ? value : ''+value;
            }
            oldValue = this._data[key];
            if (this.schema.onSet && this.schema.onSet[key]) {
                this._data[key] = this.schema.onSet[key].call(this, value, oldValue);
            }
            else this._data[key] = value;
            if (running) {
                this.publish(key, value, oldValue);
                if (this.schema.members[key] && this.schema.members[key].publish && this.schema.members[key].reciprocal) {
                    if (og.isModel(value)) value.publish(this.schema.members[key].reciprocal);
                }
            }
        },
        has:function(keys, checkLength) {
            var model=this;
            if (Array.isArray(keys)) return keys.every(hasData);
            else return hasData(keys);
            function hasData(key) {
                return model._data.hasOwnProperty(key) && model._data[key]!==undefined && model._data[key]!==null && (checkLength && og.isCollection(model._data[key]) ? model._data[key].length : true);
            }
        },
        copy: function(membersToIgnore) {
            var src = $.extend({},this._data), srcID;
            var members = this.schema.members;
            membersToIgnore = membersToIgnore || [];
            if (this.schema.key) {
                srcID = src[this.schema.key];
                delete src[this.schema.key];
            }
            // shallow copy
            Object.keys(members).forEach(function(memberName) {
                var member = src[memberName];
                if (og.isCollection(member)) delete src[memberName];
                if (membersToIgnore.indexOf(memberName) !== -1) delete src[memberName];
            });
            var model = og.add(this.schema.type, src);
            model.copied = true;
            model._unsaved = {};
            if (this.schema.key) {
                model.sourceId = srcID;
                model._unsaved[this.schema.key] = srcID;
            }
            return model;
        },
        erase: function() {
            Object.keys(this.schema.members).forEach(function(memberName) {
                var member = this.schema.members[memberName];
                if (member.type && member.reciprocal) {
                    // remove it from collection member
                    if (this[memberName] && this[memberName][member.reciprocal]) this[memberName][member.reciprocal].remove(this);
                }
                if (member.plural && member.cascadeDelete) {
                    // Cascade delete to the child collections and remove them from object graph
                    var memberCollection = this[memberName];
                    if (og.isCollection(memberCollection) || Array.isArray(memberCollection)) {
                        memberCollection.slice().forEach(function(model) {
                            model.erase();
                        });
                    }
                }
            }.bind(this));
            og[this.schema.plural].remove(this);
            if (this.schema.key) {
                var value = this[this.schema.key];
                this._set(this.schema.key, undefined);
            }
            this.publish('deleted', true, value);
            if (this.subscribers) this.subscribers.cancel();
        },
        hasUnsavedChanges: function(attr) {
            if (!attr) attr={stack:[]};
            if (!attr.stack) attr.stack=[];
            if (attr.stack.indexOf(this)>=0) return false;
            else attr.stack.push(this);
            if (this._unsaved && Object.keys(this._unsaved).length) return true;
            if (this.isNewUnsaved()) return true;
            return Object.keys(this._data).some(function(key){
                if (!this.schema.members[key] || !this.schema.members[key].cascadeSave) return false;
                var candidate = this._data[key];
                if (og.isModel(candidate) || og.isCollection(candidate)) {
                    return candidate.hasUnsavedChanges(attr);
                }
            }.bind(this));
        },
        changedToDifferentModel: function(key) {
            var oldModel = this._unsaved && this._unsaved[key];
            var newModel = this[key];
            return oldModel && oldModel !== newModel;

        },
        unsavedChanges: function(stack) {
            var unsaved={};
            if (!stack) stack=[];
            if (stack.indexOf(this)>=0) return undefined;
            else stack.push(this);
            if (this.hasUnsavedChanges() && this._unsaved) {
                Object.keys(this._unsaved).forEach(function(key) {
                    var member=this.get(key), relationSchema, modelSchema;
                    if (og.isModel(member)) {
                        relationSchema = this.schema.members[key];
                        if (relationSchema) {
                            modelSchema = schemata[relationSchema.type];
                            if (relationSchema.key) unsaved[relationSchema.key] = member.get(modelSchema.key);
                        }
                    }
                    else {
                        unsaved[key]=member;
                        if (this.schema.members[key]==='date') unsaved[key] = new Date(unsaved[key]).getTime();
                    }
                }.bind(this));
            }
            // check member models or collections
            Object.keys(this._data).forEach(function(key) {
                var memberSchema = this.schema.members[key], candidateUnsaved;
                if (!memberSchema) return;
                var candidate = this._data[key];
                if (og.isModel(candidate) || og.isCollection(candidate)) {
                    if (!memberSchema.cascadeSave) {
                        if (this.changedToDifferentModel(key)) unsaved[memberSchema.key]=candidate[candidate.schema.key];
                    }
                    else {
                        candidateUnsaved = candidate.unsavedChanges(stack);
                        if (candidateUnsaved) unsaved[key] = candidateUnsaved;
                    }
                }
            }.bind(this));
            if (this.deleted) unsaved.deleted = true;
            // Send the primary key
            if (Object.keys(unsaved).length>0) {
                if (this.lastModified && this.lastModified.getTime) unsaved.lastModified = this.lastModified.getTime();
                if (this.schema.key && this[this.schema.key]) unsaved[this.schema.key] = this[this.schema.key];
            }
            else unsaved = undefined;
            return unsaved;
        },
        markUnsaved: function() {
            // ideally we shouldn't need this. TODO refactor events, or always use schema.key to make this unnecessary
            if (!this._unsaved) this._unsaved = {};
            Object.keys(this._data).forEach(function(key) {
                this._unsaved[key] = this._unsaved[key] || undefined;
            }.bind(this));
        },
        applyUnsavedChanges: function(outcome) {
            var schema = this.schema;
            outcome = outcome || {};
            Object.keys(schema.members).forEach(function(key) {
                if (outcome[key]) {
                    if (schema.members[key].type || schema.members[key].plural) this[key].applyUnsavedChanges(outcome[key]);
                    else this._set(key, outcome[key]);
                    if (key===schema.key) og[schema.plural]._by[outcome[key]] = this; // update the index
                    delete outcome[key];
                }
                if (schema.onSave && schema.onSave[key]) schema.onSave[key].call(this, this[key]);
            }.bind(this));
            delete this._unsaved;
            this.publish('saved', this);
        },
        clearUnsavedChanges: function(key) {
            if (this._unsaved) {
                var unsaved=this._unsaved;
                if (key) {
                    if (unsaved.key) {
                        this.set(key, unsaved[key]);
                        delete this._unsaved.key;
                    }
                }
                else {
                    Object.keys(unsaved).forEach(function(k) {
                        this.set(k, unsaved[k]);
                    }.bind(this));
                    delete this._unsaved;
                }
            }
        },
        isNewUnsaved: function() {
            if (!this.schema.key) return false;
            return !this[this.schema.key];
        },
        validates: function() {
            // Will return true by default. This method should be overridden to return validation result.
            return true;
        },
        load: function(cb) {
            if (!cb) throw "no callback";
            var model = this, path;
            if (model.get('id')) {
                path='service/'+this.schema.type+'/'+model.get('id');
                var jqxhr=$.ajax({
                    url:ajaxPath+path,
                    beforeSend:function(xhr) {
                        if (getBeforeSend) getBeforeSend(model).call(this, xhr);
                    },
                    dataType:'json'
                });
                jqxhr.done(function(data) {
                    if (Object.keys(data).length) og.add(model.schema.type, data, cb);
                    else cb();
                });
                jqxhr.fail(handleError(cb));
            }
            else cb();
            return this;
        },
        save: function(done) {
            var path='service/'+this.schema.type;
            var data={}, model=this;
            if (model.deleted) {
                if (model.isNewUnsaved()) {
                    model.erase();
                    return done && done();
                }
                else {
                    var modelObject = {};
                    if (model.id) modelObject = {id:model.id};
                    else modelObject[model.schema.key] = model[model.schema.key];
                    modelObject.deleted=true;
                    data[model.schema.plural] = [modelObject];
                    data = JSON.stringify(data);
                }
            }
            else {
                if (this.schema.fullSave || this.isNewUnsaved()) data = this.serialize();
                else data[this.schema.plural] = [this.unsavedChanges()];
                data = JSON.stringify(data);
            }
            var jqxhr=$.ajax({
                url:ajaxPath+path,
                type:'POST',
                data:data,
                contentType:'application/json',
                beforeSend:function(xhr) {
                    if (getBeforeSend) getBeforeSend(model).call(this, xhr);
                },
                dataType:'json'
            });
            jqxhr.done(function(outcome) {
                if (model.deleted) {
                    // Call applyUnsavedChanges even in case of delete to update the lastModified field
                    model.applyUnsavedChanges(outcome[model.schema.plural][0]);
                    model.erase();
                }
                else model.applyUnsavedChanges(outcome[model.schema.plural][0]);
                if (done) done(model);
            });
            jqxhr.fail(handleError(done));
        },
        publish: function(keys, value, oldValue) {
            var i, length, model=this;
            if (Array.isArray(keys)) keys.forEach(publishKey);
            else publishKey(keys);
            function publishKey(key) {
                var subscribers = model.subscribers ? model.subscribers.getFor(key) : [];
                if (subscribers.length) {
                    setImmediate(function() {
                        for (i = 0, length = subscribers.length; i < length; i += 1) {
                            subscribers[i] && subscribers[i].callback(key, value, oldValue);
                        }
                    });
                }
                if (model.schema) {
                    if (model.schema.collectionEvents) {
                        model.schema.collectionEvents.filter(function(event) {
                            return event.keys.indexOf(key) >= 0;
                        }).forEach(function(event) {
                            og[model.schema.plural].publish(event.name, model);
                        });
                    }
                    if (model.schema.bubbleEvents) {
                        var bubbleTo=model.schema.bubbleEvents.to;
                        if (!Array.isArray(bubbleTo)) bubbleTo=[bubbleTo];
                        bubbleTo.forEach(function(bubble) {
                            if (model[bubble]) model[bubble].publish(model.schema.members[bubble].reciprocal || model.schema.plural, model);
                        });
                        if (model.schema.bubbleEvents.ogPlural) og[model.schema.plural].publish(key, model, oldValue);
                    }
                }
            }
            return this;
        },
        subscribe: function(attributes, deferred, callback) {
            // callback(key, newValue, oldValue)
            if (arguments.length < 3) {
                callback = deferred;
                deferred = false;
            }
            var subscriber = new Subscriber(attributes, callback), model=this;
            this.subscribers = this.subscribers || new Subscribers(this);
            this.subscribers.add(subscriber);
            if (!deferred) {
                if (og.isCollection(model)) throw "Collection subscriptions should always be deferred.";
                if (Array.isArray(attributes)) attributes.forEach(timeCall);
                else timeCall(attributes);
            }
            function timeCall(key) {
                setImmediate(function() {callback(key, model.get && !!model.get(key))});
            }
            return subscriber;
        },
        serialize: function(stack, root, parent) {
            var isRootCall=false, collectionName, rootOutcome;
            if (!root) {
                root = [];
                isRootCall = true;
            }
            if (this.preSerialize) this.preSerialize();
            if (!stack) stack = [];
            if (stack.indexOf(this)>=0) return undefined;
            else stack.push(this);
            var outcome={};
            Object.keys(this._data).forEach(function(key) {
                var member = this.schema.members[key];
                if (!member) return;
                var candidate = this.get(key);
                if (og.isCollection(candidate)) {
                    if (member.cascadeSave) outcome[key] = candidate.serialize(stack, root, this);
                }
                else if (member.type) {
                    if (member.cascadeSave) {
                        if (og.isModel(candidate)) outcome[key] = candidate.serialize(stack, root, this);
                        else outcome[key] = null;
                    }
                    else if (member.key) {
                        // include the key unless it refers to the parent that called serialize on this model
                        if (candidate !== parent) {
                            if (og.isModel(candidate)) outcome[member.key] = candidate[candidate.schema.key];
                            else outcome[member.key] = null;
                        }
                    }
                    if (member.reference) root.push(candidate);
                    if (member.cascadeLastModified && candidate) {
                        var cascadeRoot={};
                        cascadeRoot[candidate.schema.key] = candidate[candidate.schema.key];
                        cascadeRoot.lastModified = candidate.lastModified.getTime();
                        cascadeRoot.plural = candidate.schema.plural;
                        root.push(cascadeRoot);
                    }
                }
                else if (member==='date' && candidate && candidate.getTime) outcome[key] = candidate.getTime();
                else outcome[key] = candidate;
            }.bind(this));
            if (this.deleted) outcome.deleted=true;
            if (isRootCall) {
                rootOutcome = {};
                rootOutcome[this.schema.plural] = [outcome];
                outcome = rootOutcome;
                root.forEach(function(model) {
                    if (!model.schema) {
                        outcome[model.plural] = outcome[model.plural] || [];
                        outcome[model.plural].push(model);
                        delete model.plural;
                    }
                    else {
                        collectionName = model.schema.plural;
                        if (!outcome[collectionName]) outcome[collectionName] = [model.serialize(stack, root, this)];
                        else outcome[collectionName].push(model.serialize(stack, root, parent));
                    }
                });
            }
            return outcome;
        }
    };

    function Collection(models, schema, options) {
        var collection;
        if (schema) collection = Object.create(schema.collectionProto);
        else if (this!==og) collection = this;
        else collection = new Collection();
        collection.constructor=Collection;
        collection.reset(options);
        if (models) collection.add(models, undefined, true);
        return collection;
    }
    Collection.prototype = {
        constructor:Collection,
        reset: function(options) {
            this._items = [];
            if (this.schema && this.schema.key) this._by = {};
            this._mixed = options ? !!options.mixed: false;
            this.length = 0;
            return this;
        },
        reindex: function() {
            var key;
            this.length = this._items.length;
            if (this.schema && this.schema.key) {
                this._by = {};
                this.forEach(function(model) {
                    key = model.get(this.schema.key);
                    if (typeof key != 'undefined') this._by[key] = model;
                }.bind(this));
            }
            return this;
        },
        add: function(model, at, skipPublish) {
            var self = this, key;
            if (at===undefined) at = this._items.length;
            if (!model) return this; // nothing to add
            // multiple add
            if (Array.isArray(model) || og.isCollection(model)) {
                return model.forEach(function(m, i) {self.add(m, at + i, skipPublish)});
            }
            var hasModel = running && this.has(model);
            // it's a model
            if (!running || !this._by || !hasModel) {
                this._items.splice(at, 0, model);
                this.length = this._items.length;
                if (!og.isModel(model)) throw ('not a model');
                // update index
                if (this._by) {
                    if (this.schema) key = model.get(this.schema.key);
                    if (typeof key != 'undefined') this._by[key] = model;
                    if (!this._mixed) {
                        model.subscribe(self.schema.key, true, function(key, value, oldValue) {
                            if (typeof oldValue!='undefined' && oldValue!==value && self._by[oldValue]) delete self._by[oldValue];
                            if (typeof value!='undefined' && !self._by[value] && self.some(function(m) {return m === model})) self._by[value] = model;
                        });
                    }
                }
                if (running && !skipPublish) this.publish('add', model, at);
            }
            // move to appropriate index if necessary
            if (running && hasModel) {
                if (at >= this._items.length) at=this._items.length-1;
                if (this._items[at] !== model) {
                    var index = this._items.indexOf(model);
                    this._items.splice(index, 1);
                    this._items.splice(at, 0, model);
                }
            }
            return this;
        },
        copy: function() {
            return this.map(function(model) {
                return model.copy();
            });
        },
        remove: function(model, ignoreUnsaved) {
            var index = typeof model === "number" ? model : this._items.indexOf(model), key;
            if (index > -1 && index < this._items.length) {
                model = this._items.splice(index, 1)[0];
                this.length = this._items.length;
                if (this._by && this.schema) {
                    key = model.get(this.schema.key);
                    if (typeof key != 'undefined') {
                        delete this._by[key];
                    }
                }
                this.publish('remove', model, index);
                if (running && !ignoreUnsaved) this._unsaved = true;
            }
            return this;
        },
        removeCollection: function(collection) {
            if (og.isCollection(collection) || Array.isArray(collection)) {
                var self = this;
                collection.forEach(function(model) {
                    self.remove(model);
                });
            }
            return this;
        },
        removeAll: function() {
            var collection = this;
            for (var i=collection.length-1;i>=0;i--){
                collection.remove(collection.at(i));
            }
        },
        eraseAll:function() {
            this.slice().forEach(function(model) {
                model.erase();
            });
        },
        include: function(model, condition) {
            if (condition(model)) {
                if (!this.has(model)) this.add(model, 0);
            }
            else {
                if (this.has(model)) this.remove(model);
            }
        },
        firstWhere: function(field, value) {
            return this.where(field, value).at(0);
        },
        firstThat: function(callback) {
            var found;
            this.some(function(model) {
                if (callback(model)) found=model;
                return found !== undefined;
            });
            return found;
        },
        where: function(field, value) {
            // field==value || {field:value, field:value} || function
            function matchAll(model) {
                var match=true;
                Object.keys(field).forEach(function(key) {
                    if (Array.isArray(field[key])) {
                        if (field[key].indexOf(model.get(key))<0) match=false;
                    }
                    else if (model.get(key)!==field[key]) match=false;
                });
                return match;
            }
            // Transforms an array of 'field' values into array of Model objects,
            // in the same order as the values in the array.
            function transform(val) {
                return this.filter(function(model) {
                    return model && model.get(field) === val;
                });
            }
            if (typeof field=='function') return new Collection(this.filter(field), this.schema);
            else if (typeof field=='object') return new Collection(this.filter(matchAll), this.schema);
            // Use Array.prototype.map function to map the value or array of values to a Collection of Model Objects.
            if (Array.isArray(value)) {
                return new Collection(value.map(transform, this._items), this.schema);
            }
            else {
                return new Collection([value].map(transform, this._items), this.schema);
            }
        },
        by: function(key) {
            // multiple
            var value;
            if (Array.isArray(key)) {
                value = new Collection([], this.schema);
                key.forEach(function(i) {
                    var item = this.by(i);
                    if (item) value.add(item);
                }.bind(this));
            }
            else if (typeof key != 'undefined' && this._by) value = this._by[key];
            return value;
        },
        at: function(index) {return this._items[index]},
        all: function() {return this._items},
        sort: function(comparator) {this._items.sort(comparator || this.orderBy); return this},
        has: function(model) {
            if (!model || this._items.length===0) return false;
            var key = model.get(model.schema.key);
            if (!this._mixed && key && this._by) return !!(this._by[key]); // shortcut if index exists
            return this._items.indexOf(model) >= 0;
        },
        toString: function(options) {
            options = options || {};
            return this.map(function(m) {return m.toString(options)}).join(options.joiner || '');
        },
        pluck: function(field) {
            return Array.prototype.map.apply(this._items, [function(model) {return model.get(field)}]);
        },
        hasUnsavedChanges: function(attr) {
            return this._unsaved || this.some(function(model){
                return model.hasUnsavedChanges(attr);
            });
        },
        hasNewUnsavedModel: function() {
            return this.some(function(model){
                return model.isNewUnsaved();
            });
        },
        unsavedChanges: function(stack, skipValidation) {
            if (!stack) stack=[];
            if (stack.indexOf(this)>=0) return undefined;
            else stack.push(this);
            var outcome = [];
            this.forEach(function(model) {
                var result=model.unsavedChanges(stack, skipValidation);
                if (result) outcome.push(result);
            });
            if (outcome.length || this._unsaved) return outcome;
            else return undefined;
        },
        applyUnsavedChanges: function(outcome) {
            outcome = outcome || [];
            this.forEach(function(model, j) {
                model.applyUnsavedChanges(outcome[j]);
            });
            delete this._unsaved;
        },
        publish: function(keys, value, oldValue) {
            var i, length, model=this;
            if (Array.isArray(keys)) keys.forEach(publishKey);
            else publishKey(keys);
            function publishKey(key) {
                var subscribers = model.subscribers ? model.subscribers.getFor(key) : [];
                if (subscribers.length) {
                    setImmediate(function() {
                        for (i = 0, length = subscribers.length; i < length; i += 1) {
                            subscribers[i] && subscribers[i].callback(key, value, oldValue);
                        }
                    });
                }
            }
            return this;
        },
        subscribe: Model.prototype.subscribe,
        listenDeleted: function() {
            var collection=this;
            collection.forEach(function(model) {
                model.subscribe('deleted', 1, function() {collection.remove(model)});
            });
            return this;
        },
        unique: function(attr) {
            var i, idx, items = this._items, fn;
            if (attr === undefined) fn = function(a,b) {return a === b};
            else if (typeof attr === "function") fn = attr;
            else if (Array.isArray(attr)) {
                var ln = attr.length;
                fn = function(a,b) {
                    for (var j = 0; j < ln; j++) {
                        if (a.get(attr[j]) !== b.get(attr[j])) return false;
                    }
                    return true;
                }
            }
            else fn = function(a,b) {return a.get(attr) === b.get(attr)};
            for (i = (items.length - 1); i >= 0; i--) {
                for (idx = 0; idx < i; idx++) {
                    if (fn(items[i], items[idx])) break;
                }
                if (idx < i) this.remove(i);
            }
            return this;
        },
        serialize: function(stack, root, parent) {
            if (!stack) stack=[];
            if (stack.indexOf(this)>=0) return undefined;
            else stack.push(this);
            var out = this.map(function(model) {
                return model.serialize(stack, root, parent);
            });
            if (this.schema.recOfArrays) return switchRecordArray(out);
            else return out;
        }
    };
    // TODO make these return collections
    ['filter','forEach','every','map','some','indexOf','slice','reduce'].forEach(function(name) {
        Collection.prototype[name] = function() {
            return Array.prototype[name].apply(this._items, arguments);
        };
    });

    function Subscriber(attributes, callback) {
        this.attributes = attributes instanceof Array ? attributes : [attributes];
        this.callback = callback;
        this.id = (Subscriber.count += 1);
    }
    Subscriber.count = 0;
    function Subscribers(publisher) {}
    Subscribers.prototype = [];
    Subscribers.prototype.constructor = Subscribers;
    Subscribers.prototype.add = function(subscriber) {
        var id = subscriber.id;
        this[id] = subscriber;
    };
    Subscribers.prototype.remove = function(subscriber) {
        delete this[subscriber.id];
    };
    Subscribers.prototype.cancel = function() {
        var subscribers=this;
        Object.keys(this).forEach(function(id) {delete subscribers[id]});
    };
    Subscribers.prototype.getFor = function(attributes) {
        var affectedSubscribers = [], id, subscriber;
        if (!Array.isArray(attributes)) attributes = [attributes];
        function matchAttributes(a) {return attributes.indexOf(a) !== -1 || a===undefined}
        for (id in this) {
            if (this.hasOwnProperty(id) && (subscriber = this[id]).attributes.some(matchAttributes)) affectedSubscribers.push(subscriber);
        }
        return affectedSubscribers;
    };

    og.publish = Model.prototype.publish;
    og.subscribe = Model.prototype.subscribe;
    og.switchRecordArray = switchRecordArray;
    function switchable(source) {
        return !Array.isArray(source) && typeof source == 'object' && Object.keys(source).every(function(el) {return Array.isArray(source[el]) || source[el]===null});
    }
    function switchRecordArray(ra) {
        var out;
        if (Array.isArray(ra)) {
            // switch from an array of records to a record of arrays
            out = {};
            ra.forEach(function(record, row) {
                Object.keys(record).forEach(function(col) {
                    (out[col] = out[col] || [])[row] = record[col];
                });
            });
        }
        else if (ra) {
            // switch from a record of arrays to an array of records
            out = [];
            // IE doesn't like Object.keys so:
            $.map(ra, function(attr, col) {
                attr && attr.forEach(function(value, row) {
                    (out[row] = out[row] || {})[col] = value;
                });
            });
        }
        return out || [];
    }
    return og;
}

function getBeforeSend() {
    return function beforeSend(xhr) {
        var ieNoCache="ieNoCache="+new Date().getTime();
        if (this.type==='GET') {
            this.url += (this.url.indexOf('?')>=0 ? '&' : '?') + ieNoCache;
        }
    };
}
function handleError(done) {
    return function(jqXHR) {
        if (jqXHR.responseText && jqXHR.responseText.length) {
            if (done) {
                if (jqXHR.responseJSON) {
                    if (jqXHR.responseJSON.exception) done(jqXHR.responseJSON);
                    else if (jqXHR.responseJSON.errors) done(jqXHR.responseJSON.errors);
                }
                else done(Error(jqXHR.responseText));
            }
        }
        else if (done) done(Error("The response from the server was empty, or there was an error on the server. You may have to refresh/reload this page to restore functionality."));
    }
}
function getURLParams() {
    var params={};
    var searchParams=window.location.search.split(/[?=&]/);
    for (var i=1; i<searchParams.length; i+=2) {
        var value = parseInt(searchParams[i+1],10);
        params[searchParams[i]] = isNaN(value) ? String(searchParams[i + 1]) : value;
    }
    return params;
}

if (typeof exports !== 'undefined') exports.ObjectGraph=ObjectGraph;