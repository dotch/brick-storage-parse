(function () {

  var APIURL = "https://api.parse.com/1/";

  function serializeObject(obj) {
      var pairs = [];
      for (var prop in obj) {
          if (!obj.hasOwnProperty(prop)) {
              continue;
          }
          pairs.push(prop + '=' + obj[prop]);
      }
      return pairs.join('&');
  }

  function ParseStore(appId, apiKey, className, key) {

    var self = this;
    self.appId = appId;
    self.className = className;
    self.apiKey = apiKey;
    self.key = key;
    self.url = APIURL + "classes/" + className + "/";

  }

  ParseStore.prototype = {

    _ajax: function(options) {
      var self = this;
      options = options || {};
      var url = options.url || self.url;
      var id = options.id || '';
      var method = options.method || 'GET';
      var params = options.params ? '?' + encodeURI(serializeObject(options.params)) : '';
      var data = options.data ? JSON.stringify(options.data) : undefined;
      return new Promise(function(resolve, reject) {
        var xhr = new XMLHttpRequest();
        xhr.open(method, self.url + id + params);
        xhr.setRequestHeader("X-Parse-Application-Id", self.appId);
        xhr.setRequestHeader("X-Parse-REST-API-Key", self.apiKey);
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.onload = function() {
          if (xhr.status == 200 || xhr.status == 201) {
            resolve(JSON.parse(xhr.response));
          } else {
            reject(Error(xhr.statusText));
          }
        };
        xhr.onerror = function() {
          reject(Error("Network Error"));
        };
        xhr.send(data);
      });
    },
    _getIdForKey: function(objKey) {
      var self = this;
      var params = {
        where: '{"' + self.key + '":"' + objKey + '"}'
      };
      return self._ajax({
        'params':params
      }).then(function(res){
        return res.results.length > 0 ? res.results[0].objectId : undefined;
      });
    },
    _stripObjects: function(objects) {
      var strippedObjects = [];
      for (var i = 0; i < objects.length; i++) {
        var obj = objects[i];
        delete(obj.createdAt);
        delete(obj.objectId);
        delete(obj.updatedAt);
        strippedObjects.push(obj);
      }
      return strippedObjects;
    },

    /**
     * Save an object into the database
     * @param  {object}    object   the object to be saved
     * @return {promise}   Promise for the id/key to which 
     *                     it was saved
     */
    save: function (object) {
      var self = this;
      if (self.key) {
        // check if an item with the objects key already exists
        return self._getIdForKey(object[self.key])
          .then(function(objId){
            if (objId) {
              return Promise.reject(Error("Contsraint Error"));
            } else {
              return self._save(object);            
            }
          });
      } else {
        return self._save(object);
      }
    },
    _save: function(object) {
      var self = this;
      return self._ajax({
        'method':'POST',
        'data':object
      }).then(function(result){
        if (self.key) {
          return object[self.key];
        } else {
          return result.objectId;
        }
      });
    },

    /**
     * Update or insert an Object at the given id/key.
     * @param {number}               id
     * @param {string|number|object} object
     * @return {promise}             Promise for the id/key of 
     *                               the created object
     */
    set: function (key, object) {
      var self = this;
      if (self.key) {
        // get the objectid
        return self._getIdForKey(object[self.key])
          .then(function(objId){
            if (objId) {
              // object exists so update.
              return self._update(objId, object);
            } else {
              // object does not exist, just save it.
              return self._save(object);
            }
          });
      } else {

      }
    },

    _update: function (objId,object) {
      var self = this;
      return self._ajax({
        'method':'PUT',
        'id': objId,
        'data': object
      }).then(function(result){
        console.log("update",result);
        if (self.key) {
          return object[self.key];
        } else {
          return objId;
        }
      });
    },

    /**
     * Get the object saved at a given id/key.
     * @param  {number|string} id
     * @return {promise}       Promise for the object
     */
    get: function (objKey) {
      var self = this;
      var params = {};
      var id;
      if (self.key) { 
        params.where = '{"' + self.key + '":"' + objKey + '"}';
        return self._ajax({
          'params':params
        }).then(function(res){
         return self._stripObjects(res.results)[0];
        });
      } else {
        return self._ajax({
          'id':objKey
        }).then(function(res){
         return self._stripObjects([res])[0];
        });
      }
    },

    /**
     * Removes the the entry with the supplied id/key from the database.
     * @param  {number|string} id
     * @return {promise} for undefined
     */
    remove: function (key) {
      var self = this;
      return self._getIdForKey(key).then(function(objId){
        return self._remove(objId);
      });
    },
    _remove: function (objId) {
      var self = this;
      return self._ajax({
        'method':'DELETE',
        'id': objId
      }).then(function(result){
        return result.objectId;
      });
    },

    /**
     * Returns all databse entries.
     * @param  {options} 
     *   {string}  orderby    The key by which the results will be ordered.
     *   {boolean} reverse    Reverse the order of the results.
     * @return {promise}      Promise for the objects
     */
    getAll: function(options) {
      var self = this;
      return self.getMany(options);
    },

    /**
     * Returns multiple database entries.
     * @param  {options} 
     *   {any}     stt        The first id of the results.
     *   {any}     end        The last id of the results.
     *   {number}  count      The number of results.
     *   {number}  offset     The offset of the first result.
     *   {string}  orderby    The key by which the results will be ordered.
     *   {boolean} reverse    Reverse the order of the results.
     *   use [start] with ([end] or/and [count])
     *   use [offset] with ([end] or/and [count])
     *   using [end] together with [count] the results stop at whatever comes first.
     * @return {promise}      Promise for the objects
     */
    getMany: function(options) {
      options = options || {};
      var self = this;
      var start = options.start;
      var end = options.end;
      var count = options.count || undefined;
      var offset = options.offset || undefined;
      var reverse = options.reverse || false;
      var orderby = options.orderby;
      var params = {};
      if (self.key) { params.order = self.key; } else {
        params.order = 'createdAt';
      }
      if (count) { params.limit = count; }
      if (offset) { params.skip = offset; }
      if (orderby) { params.order = orderby; }
      if (start) { params.where = '{"'+self.key+'":{"$gte":"'+start+'"}}'; }
      if (end) { params.where = '{"'+self.key+'":{"$lte":"'+end+'"}}'; }
      if (start && end) { 
        params.where = '{"'+self.key+'":{"$gte":"'+start+'","$lte":"'+end+'"}}'; 
      }
      if (reverse) { params.order = "-" + params.order; }
      return self._ajax({
        'params':params
      }).then(function(result){
        var res = self._stripObjects(result.results);
        return res;
      });
    },

    /**
     * Returns the number of database entries.
     * @return {promise} Promise for the size.
     */
    size: function() {
      var self = this;
      var params = {
        count: 1,
        limit: 0
      };
      return self._ajax({
        'params': params
      }).then(function(result){
        return result.count;
      });
    },

    // use bulk api in the future
    /**
     * Deletes all database entries.
     * @return {promise} Promise for undefined.
     */
    clear: function () {
      var self = this;
      var params = self.key ? {order: self.key} : undefined;
      return self._ajax({
          'params': params
        })
        .then(function(result){
          return result.results;
        })
        .then(function(allItems){
          var promises = [];
          for (var i = 0; i < allItems.length; i++) {
            var item = allItems[i];
            promises.push(self._remove(item.objectId));
          }
          return Promise.all(promises).then(function(){
            return null;
          });
        });
    }
  };


var StoragePrototype = Object.create(HTMLElement.prototype);

  StoragePrototype.createdCallback = function () {
    this.apiKey = this.getAttribute('restapikey');
    this.className = this.getAttribute('classname');
    this.appId = this.getAttribute('appid');
    this.key = this.getAttribute('key');
    this.storage = new ParseStore(this.appId, this.apiKey, this.className, this.key);
  };

  StoragePrototype.save = function (object) {
    return this.storage.save(object);
  };
  StoragePrototype.set = function (key, object) {
    return this.storage.set(key, object);
  };
  StoragePrototype.update = function (key, object) {
    return this.storage.update(key, object);
  };
  StoragePrototype.get = function (key) {
    return this.storage.get(key);
  };
  StoragePrototype.remove = function (key) {
    return this.storage.remove(key);
  };
  StoragePrototype.getAll = function (options) {
    return this.storage.getAll(options);
  };
  StoragePrototype.getMany = function (options) {
    return this.storage.getMany(options);
  };
  StoragePrototype.size = function () {
    return this.storage.size();
  };
  StoragePrototype.clear = function () {
    return this.storage.clear();
  };

  document.registerElement('x-storage-parse', {
    prototype: StoragePrototype
  });

})();