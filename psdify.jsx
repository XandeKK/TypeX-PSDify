#include "PhotoshopJsonParser.js"

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

		// Add cleaned image
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
			textItemRef.font = app.fonts.getByName(font).postScriptName;
		} catch (error) {
			// alert("Does not have this font: " + font);
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
		var raw_file;
		var cleaned_file;
		var filename = get_filename(String(files_json[i]));
		var json_file = String(files_json[i]);
		var psd_file = json_file.replace('json', 'psd');

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