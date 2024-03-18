if (typeof JSON !== "object") {
    JSON = {};
}

(function () {
    "use strict";

    var rx_one = /^[\],:{}\s]*$/;
    var rx_two = /\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g;
    var rx_three = /"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g;
    var rx_four = /(?:^|:|,)(?:\s*\[)+/g;
    var rx_escapable = /[\\"\u0000-\u001f\u007f-\u009f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;
    var rx_dangerous = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;

    function f(n) {
        return (n < 10)
            ? "0" + n
            : n;
    }

    function this_value() {
        return this.valueOf();
    }

    if (typeof Date.prototype.toJSON !== "function") {

        Date.prototype.toJSON = function () {

            return isFinite(this.valueOf())
                ? (
                    this.getUTCFullYear()
                    + "-"
                    + f(this.getUTCMonth() + 1)
                    + "-"
                    + f(this.getUTCDate())
                    + "T"
                    + f(this.getUTCHours())
                    + ":"
                    + f(this.getUTCMinutes())
                    + ":"
                    + f(this.getUTCSeconds())
                    + "Z"
                )
                : null;
        };

        Boolean.prototype.toJSON = this_value;
        Number.prototype.toJSON = this_value;
        String.prototype.toJSON = this_value;
    }

    var gap;
    var indent;
    var meta;
    var rep;


    function quote(string) {
        rx_escapable.lastIndex = 0;
        return rx_escapable.test(string)
            ? "\"" + string.replace(rx_escapable, function (a) {
                var c = meta[a];
                return typeof c === "string"
                    ? c
                    : "\\u" + ("0000" + a.charCodeAt(0).toString(16)).slice(-4);
            }) + "\""
            : "\"" + string + "\"";
    }


    function str(key, holder) {

        var i;          // The loop counter.
        var k;          // The member key.
        var v;          // The member value.
        var length;
        var mind = gap;
        var partial;
        var value = holder[key];

        if (
            value
            && typeof value === "object"
            && typeof value.toJSON === "function"
        ) {
            value = value.toJSON(key);
        }

        if (typeof rep === "function") {
            value = rep.call(holder, key, value);
        }

        switch (typeof value) {
        case "string":
            return quote(value);

        case "number":
            return (isFinite(value))
                ? String(value)
                : "null";

        case "boolean":
        case "null":
            return String(value);

        case "object":
            if (!value) {
                return "null";
            }

            gap += indent;
            partial = [];

            if (Object.prototype.toString.apply(value) === "[object Array]") {
                length = value.length;
                for (i = 0; i < length; i += 1) {
                    partial[i] = str(i, value) || "null";
                }

                v = partial.length === 0
                    ? "[]"
                    : gap
                        ? (
                            "[\n"
                            + gap
                            + partial.join(",\n" + gap)
                            + "\n"
                            + mind
                            + "]"
                        )
                        : "[" + partial.join(",") + "]";
                gap = mind;
                return v;
            }

            if (rep && typeof rep === "object") {
                length = rep.length;
                for (i = 0; i < length; i += 1) {
                    if (typeof rep[i] === "string") {
                        k = rep[i];
                        v = str(k, value);
                        if (v) {
                            partial.push(quote(k) + (
                                (gap)
                                    ? ": "
                                    : ":"
                            ) + v);
                        }
                    }
                }
            } else {
                for (k in value) {
                    if (Object.prototype.hasOwnProperty.call(value, k)) {
                        v = str(k, value);
                        if (v) {
                            partial.push(quote(k) + (
                                (gap)
                                    ? ": "
                                    : ":"
                            ) + v);
                        }
                    }
                }
            }

            v = partial.length === 0
                ? "{}"
                : gap
                    ? "{\n" + gap + partial.join(",\n" + gap) + "\n" + mind + "}"
                    : "{" + partial.join(",") + "}";
            gap = mind;
            return v;
        }
    }

    if (typeof JSON.stringify !== "function") {
        meta = {
            "\b": "\\b",
            "\t": "\\t",
            "\n": "\\n",
            "\f": "\\f",
            "\r": "\\r",
            "\"": "\\\"",
            "\\": "\\\\"
        };
        JSON.stringify = function (value, replacer, space) {

            var i;
            gap = "";
            indent = "";

            if (typeof space === "number") {
                for (i = 0; i < space; i += 1) {
                    indent += " ";
                }

            } else if (typeof space === "string") {
                indent = space;
            }

            rep = replacer;
            if (replacer && typeof replacer !== "function" && (
                typeof replacer !== "object"
                || typeof replacer.length !== "number"
            )) {
                throw new Error("JSON.stringify");
            }

            return str("", {"": value});
        };
    }

    if (typeof JSON.parse !== "function") {
        JSON.parse = function (text, reviver) {
            var j;

            function walk(holder, key) {
                var k;
                var v;
                var value = holder[key];
                if (value && typeof value === "object") {
                    for (k in value) {
                        if (Object.prototype.hasOwnProperty.call(value, k)) {
                            v = walk(value, k);
                            if (v !== undefined) {
                                value[k] = v;
                            } else {
                                delete value[k];
                            }
                        }
                    }
                }
                return reviver.call(holder, key, value);
            }

            text = String(text);
            rx_dangerous.lastIndex = 0;
            if (rx_dangerous.test(text)) {
                text = text.replace(rx_dangerous, function (a) {
                    return (
                        "\\u"
                        + ("0000" + a.charCodeAt(0).toString(16)).slice(-4)
                    );
                });
            }

            if (
                rx_one.test(
                    text
                        .replace(rx_two, "@")
                        .replace(rx_three, "]")
                        .replace(rx_four, "")
                )
            ) {
                j = eval("(" + text + ")");

                return (typeof reviver === "function")
                    ? walk({"": j}, "")
                    : j;
            }

            throw new SyntaxError("JSON.parse");
        };
    }
}());

function sanitizeFont(string) {
    string = string.split(' ').join('');
    var regex = /-(reg(ular)?|ital(ic)?|bold|bold[_-]?italic)$/gi;
    var result = regex.test(string);

    if (!result) {
        regex = /(regular|italic|bold|bold-italic)/gi;
        var matches = string.match(regex);
        if (matches) {
            var match;
            while ((match = regex.exec(string)) !== null) {
                string = string.split('');
                string.splice(match.index, 0, '-');
                string = string.join('');
                return string;
            }
        } 
    }

    return string;
}

function convertStringToArray(string) {
    var numbers = string.split(',');

    var x = parseFloat(numbers[0].replace('(', ""));
    var y = parseFloat(numbers[1].replace(')', ""));

    return Array(x, y);
}

function trim(str){
    return str.replace(/\s*(\S*)\s*/, "$1");
}

function get_filename(str) {
    var str_splited = str.split('/');
    var filename = str_splited[str_splited.length - 1];
    return filename.split('.')[0];
}

app.preferences.rulerUnits = Units.PIXELS; 
app.preferences.typeUnits = TypeUnits.PIXELS; 

function _open(raw_file, cleaned_file, json_file, output_file) {
    var fileRef;
    var docRef;
    if (raw_file != undefined) {
        fileRef = File(raw_file);
        docRef = app.open(fileRef);

        tempFfileRef = File(cleaned_file);
        tempDocRef = app.open(tempFfileRef);
        app.activeDocument = tempDocRef;
        tempDocRef.artLayers[0].duplicate(docRef);
        tempDocRef.close(SaveOptions.DONOTSAVECHANGES);
        
        app.activeDocument = docRef;
        tempDocRef = null;
        tempDocRef = null;
    } else {
        fileRef = File(cleaned_file);
        docRef = app.open(fileRef);
    }

    const jsonFile = File(json_file); 
    jsonFile.encoding = "UTF-8";
    jsonFile.open ('r');
    
    const data = jsonFile.read(); 
    jsonFile.close();

    var texts = JSON.parse(data).texts;

    for (var index in texts) {
        var object = texts[index];
        var position = convertStringToArray(object.position);
        var size = convertStringToArray(object.size);
        var left = object.text.content_margins['0'];
        var right = object.text.content_margins['2'];
        var text = object.text.text.replace('\n', '\r');
        var _fonts = object.text.extra_info_for_photoshop.fonts;
        var bold = object.text.bold;
        var italic = object.text.italic;
        var font = '';
        var leading = object.text.extra_info_for_photoshop.leading;

        if (bold && italic) {
            font = _fonts['bold-italic'];
        } else if (bold) {
            font = _fonts['bold'];
        } else if (italic) {
            font = _fonts['italic'];
        } else {
            font = _fonts['regular'];
        }

        font = font.split('/').pop().split('.').shift();

        position[1] += object.text.extra_info_for_photoshop.y;

        position[0] += left;
        size[0] = size[0] - left - right;

        var artLayerRef = docRef.artLayers.add();
        artLayerRef.kind = LayerKind.TEXT;

        var textItemRef = artLayerRef.textItem;
        textItemRef.useAutoLeading = false;
        textItemRef.kind = TextType.PARAGRAPHTEXT;
        textItemRef.justification = Justification.CENTER;
        textItemRef.leading = leading;
        textItemRef.hyphenation = false;
        textItemRef.contents = text;
        textItemRef.capitalization = object.text.uppercase ? TextCase.ALLCAPS : TextCase.NORMAL;
        textItemRef.size = object.text.font_size;
        textItemRef.position = position;    
        textItemRef.tracking = object.text.letter_spacing;
        textItemRef.width = size[0];
        textItemRef.height = object.text.extra_info_for_photoshop.height + (object.text.extra_info_for_photoshop.height * 0.3);

        try {
            textItemRef.font = app.fonts.getByName(sanitizeFont(font)).postScriptName;
        } catch (error) {
            alert("Does not have this font: " + font);
        }

        artLayerRef = null;
        textItemRef = null;
    }

    var psdFile = new File( output_file );
    docRef.saveAs(psdFile);
    docRef.close(SaveOptions.DONOTSAVECHANGES);
    
    jsonFile = null;
    texts = null;
    fileRef = null;
    docRef = null;
}

var directory = Folder.selectDialog();
if (directory != null) {
    var json_folder = Folder(directory + '/json');
    var raw_folder = Folder(directory + '/raw');
    var cleaned_folder = Folder(directory + '/cleaned');

    var files_json = json_folder.getFiles();
    var files_raw = raw_folder.getFiles();
    var files_cleaned = cleaned_folder.getFiles();

    for (var i=0; i<files_json.length; i++) {
        if (String(files_json[i]).split('.')[1] != "json") {
            continue;
        }

        var raw_file;
        var cleaned_file;
        var filename = get_filename(String(files_json[i]));
        var json_file = String(files_json[i]);
        var psd_file = json_file.split('.')[0];
        psd_file += '.psd';

        for (var j=0; j<files_raw.length; j++) {
            if (filename == get_filename(String(files_raw[j]))) {
                raw_file = files_raw[j];
                break;
            }
        }

        for (var j=0; j<files_cleaned.length; j++) {
            if (filename == get_filename(String(files_cleaned[j]))) {
                cleaned_file = files_cleaned[j];
                break;
            }
        }

        _open(raw_file, cleaned_file, json_file, psd_file);
    }
}