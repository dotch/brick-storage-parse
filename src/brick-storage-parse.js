/* global ParseStore */

(function () {

  var BrickStorageParseElementPrototype = Object.create(HTMLElement.prototype);

  BrickStorageParseElementPrototype.attachedCallback = function () {
    this.apiKey = this.getAttribute('restapikey');
    this.className = this.getAttribute('classname');
    this.appId = this.getAttribute('appid');
    this.key = this.getAttribute('keyname');
    this.storage = new ParseStore(this.appId, this.apiKey, this.className, this.key);
  };

  BrickStorageParseElementPrototype.insert = function (object) {
    return this.storage.insert(object);
  };
  BrickStorageParseElementPrototype.set = function (object) {
    return this.storage.set(object);
  };
  BrickStorageParseElementPrototype.setMany = function (objects) {
    return this.storage.setMany(objects);
  };
  BrickStorageParseElementPrototype.get = function (key) {
    return this.storage.get(key);
  };
  BrickStorageParseElementPrototype.remove = function (key) {
    return this.storage.remove(key);
  };
  BrickStorageParseElementPrototype.getMany = function (options) {
    return this.storage.getMany(options);
  };
  BrickStorageParseElementPrototype.size = function () {
    return this.storage.size();
  };
  BrickStorageParseElementPrototype.clear = function () {
    return this.storage.clear();
  };

  // Register the element
  window.BrickStorageParseElement = document.registerElement('brick-storage-parse', {
    prototype: BrickStorageParseElementPrototype
  });

})();
