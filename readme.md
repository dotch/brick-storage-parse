# x-storage-parse

## Demo

[Check it live!](http://dotch.github.io/brick-storage-parse)

## Usage

1. Import Web Components polyfill:

    ```html
    <script src="bower_components/platform/platform.js"></script>
    ```

2. Import Custom Element:

    ```html
    <link rel="import" href="src/element.html">
    ```

3. Start using it:

    ```html
    <brick-storage-indexeddb></brick-storage-indexeddb>
    ```

## Options

Attribute     | Options     | Default      | Description
---           | ---         | ---          | ---
`appid`       | *string*    |              | Parse app id.
`restapikey`  | *string*    |              | Parse rest api key.
`classname`   | *string*    |              | Parse class name.
`keyname`     | *string*    | objectId     | The unique key for all objects.


appid="Jex2pgGOUnZQHiSJOvbqUDoKO0qmJO948Rtcu4oy"
                     classname="item"
                     restapikey="tI5To9viL2ygoURZFN7uTnh439XXqkSRk0xFRfLH"
                     key="k">
## Methods

Method            | Returns a promise for  | Description
---               | ---                    | ---
`insert(object)`  | key of the saved object| Insert an object.
`set(object)`     | key of the saved object| Insert/upate an object.
`get(key)`        | object                 | Retrieves the object with the key.
`remove(key)`     | undefined              | Deletes the object with the key.
`getMany(options)`| array multiple objects | Retrieves multiple stored objects. If no filtering options are provided, it returns all objects.<ul><li>`options.start` - The first key of the results.</li><li>`options.end` - The last key of the results.</li><li>`options.count` - The number of results.</li><li>`options.offset` - The offset of the first result when set to true.</li><li>`options.orderby` - The key/index by which the results will be ordered. `options.start` and `options.end` use this key/index</li><li>`options.reverse` - Reverse the order of the results.</li></ul>
`size()`          | number of stored items | Returns the number of stored objects.
`clear()`         | undefined              | Deletes all database entries.

## Development

In order to run it locally you'll need to fetch some dependencies and a basic server setup.

* Install [Bower](http://bower.io/) & [Gulp](http://gulpjs.com/):

    ```sh
    $ [sudo] npm install -g bower gulp
    ```

* Install local dependencies:

    ```sh
    $ bower install && npm install
    ```

* To test your project, start the development server and open `http://localhost:3001`.

    ```sh
    $ gulp server
    ```

* To build your css and lint your scripts.

    ```sh
    $ gulp build
    ```

* To provide a live demo, send everything to `gh-pages` branch.

    ```sh
    $ gulp deploy
    ```

## License

[MIT License](http://opensource.org/licenses/MIT)
