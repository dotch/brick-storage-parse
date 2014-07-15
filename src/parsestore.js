(function () {

  function NetworkError(message){
    this.name = "NetworkError";
    this.message = message || "Network Error";
  }
  NetworkError.prototype = new Error();
  NetworkError.prototype.constructor = NetworkError;

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
    self.url = APIURL + "classes/" + className + "/";
    self.batchUrl = APIURL + "batch";
    self.batchPath = "/1/classes/" + self.className + "/";
    if (key) {
      self.key = key;
      self.useParseIds = false;
    } else {
      self.key = "objectId";
      self.useParseIds = true;
    }
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
        xhr.open(method, url + id + params);
        xhr.setRequestHeader("X-Parse-Application-Id", self.appId);
        xhr.setRequestHeader("X-Parse-REST-API-Key", self.apiKey);
        xhr.setRequestHeader("Content-Type", "text/plain");
        xhr.onload = function() {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            reject(Error(xhr.statusText));
          }
        };
        xhr.onerror = function() {
          reject(new NetworkError());
        };
        xhr.send(data);
      });
    },

    // remove the attributes parse adds to each object.
    // keep the objectId in case we are using it.
    _stripObjects: function(objects) {
      var self = this;
      var strippedObjects = [];
      for (var i = 0; i < objects.length; i++) {
        var obj = objects[i];
        delete(obj.createdAt);
        if (!self.useParseIds) {
          delete(obj.objectId);
        }
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
    insert: function (object) {
      var self = this;
      // if we dont use Parses ObjectIds we need to check if
      // a duplicate item (same self.key) already exists
      // else we can just insert the item and parse will do the
      // id based check
      if (!self.useParseIds) {
        // check if the object has a key.
        if (!object[self.key]) {
          return Promise.reject("The object has to have a key.");
        }
        // check if an item with the objects key already exists.
        return self._get(object[self.key])
          .then(function(oldObj){
            if (oldObj) {
              return Promise.reject(Error("Constraint Error"));
            } else {
              return self._insert(object);
            }
          });
      } else {
        return self._insert(object);
      }
    },
    _insert: function(object) {
      var self = this;
      return self._ajax({
        'method':'POST',
        'data':object
      }).then(function(result){
        if (self.useParseIds) {
          return result.objectId;
        } else {
          return object[self.key];
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
    set: function (newObject) {
      var self = this;
      // check if item exists
        // check if the object has a key.
      if (!newObject[self.key]) {
        return Promise.reject(new Error("The object has to have a key."));
      }
      return self._get(newObject[self.key])
        .then(function(oldObject){
          if (oldObject) {
            // object exists so update.
            return self._update(oldObject,newObject);
          } else {
            // object does not exist, just insert it.
            return self._insert(newObject);
          }
        });
    },
    // parse does partial updates, we don't so work around this.
    _update: function (oldObject, newObject) {
      var self = this;
      // get diff
      var diff = Object.keys(oldObject).filter(function(x) {
        return Object.keys(newObject).indexOf(x) < 0 &&
              ["createdAt","updatedAt","objectId"].indexOf(x) < 0;
      });
      for (var i = 0; i < diff.length; i++) {
        newObject[diff[i]] = '{"__op":"Delete"}';
      }
      return self._ajax({
        'method':'PUT',
        'id': oldObject.objectId,
        'data': newObject
      }).then(function(result){
        if (self.key) {
          return newObject[self.key];
        } else {
          return result.objectId;
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
      return self._get(objKey).then(function(res){
        if (res) {
          return self._stripObjects([res])[0];
        } else {
          return;
        }
      });
    },
    // get object without stripping properties
    _get: function (objKey) {
      var self = this;
      var params = {};
      params.where = '{"' + self.key + '":"' + objKey + '"}';
      return self._ajax({
        'params':params
      }).then(function (res) {
        if (res.results.length > 0) {
          return res.results[0];
        } else {
          return undefined;
        }
      });
    },

    /**
     * Removes the the entry with the supplied id/key from the database.
     * @param  {number|string} id
     * @return {promise} for undefined
     */
    remove: function (key) {
      var self = this;
      if (self.useParseIds) {
        return self._remove(key);
      } else {
        return self._get(key).then(function(obj){
          return self._remove(obj.objectId);
        });
      }
    },
    // delete based on objectId
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
      var orderby = options.orderby ? options.orderby : self.key || "objectId";
      var params = {};
      if (count) { params.limit = count; }
      if (offset) { params.skip = offset; }
      if (orderby) { params.order = orderby; }
      if (start) { params.where = '{"'+ orderby +'":{"$gte":"'+start+'"}}'; }
      if (end) { params.where = '{"'+ orderby +'":{"$lte":"'+end+'"}}'; }
      if (start && end) {
        params.where = '{"'+ orderby +'":{"$gte":"'+start+'","$lte":"'+end+'"}}';
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

    /**
     * Deletes all database entries.
     * @return {promise} Promise for undefined.
     */
    clear: function () {
      var self = this;
      return self._ajax()
        .then(function(result){
          return result.results;
        })
        .then(function(allItems){
          var requests = [];
          for (var i = 0; i < allItems.length; i++) {
            var item = allItems[i];
            var request = {};
            request.method = "DELETE";
            request.path = self.batchPath + item.objectId;
            requests.push(request);
          }
          return self._ajax({
            "method": 'POST',
            "url": self.batchUrl,
            "data": {"requests":requests}
          });
        });
    }
  };

  window.ParseStore = ParseStore;

})();
