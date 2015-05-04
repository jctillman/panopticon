
var deepMap = function(arr, func){return arr.map(function(n){return Array.isArray(n) ? deepMap(n, func) : func(n); });};
var deepCopy = function(arr) {if(arr){return deepMap(arr, function(n){return n});}return null}
var average = function(arr){if (arr) { return arr.reduce(function(a,b){return a + b}, 0) / arr.length;} return null; }
var sizeOfLarger = function(arr, size) { return arr.filter(function(n){return n > size;}).length; }

function Panopticon(options){
	//Alpha settings--those you can set without knowing what the resolution of the camera will be
	//Beta settings get called when we first get data back from the camera.
	var self = this;
	var fh = new FrameHandler(options);
	this.onFrames = [];
	this.setAlphaSettings(options);
	fh.onFrame(function(img){
		if(!self.betaInitialized){
			self.setBetaSettings(img);
			return;
		}
		var movement = self.getMovementObject(img);
		self.onFrames.map(function(func){func(movement);});
	});
}

Panopticon.prototype.onFrame = function(func){
	this.onFrames.push(func);
};

Panopticon.prototype.setAlphaSettings = function(options){

	//Have no yet done beta initialization.
	this.betaInitialized = false;

	//How many columns do we want to examine?
	this.numCols = options.numCols || 36;
	this.numRows = options.numRows || 24;
	
	//How many of these columns do we want to require to be moving before anything moves.
	this.requiredCols = options.requiredCols || 12;
	this.requiredRows = options.requiredRows || 8;

	//Slightly more advanced settings.
	//What's the biggest movement we anticipate, in per-percentage-of-screen distances?  Won't really work past 20%, probably.
	//This also takes up some serious time working.
	this.biggestMovementPercentage = options.biggestMovementPercentage || 7;
	this.dampening = options.dampening || 10;
	this.stepSearchSize = options.stepSearchSize || 1;
	this.minimumNoticedScrollDistance = options.minimumNoticedScrollDistance || 3;
	this.showVideo = options.showVideo || false;
	this.threshhold = options.threshhold || 50;

	this.elementId = options.elementId;
};


Panopticon.prototype.setBetaSettings = function(img){
	if(img && img.width && img.height){
		this.columnSpacing = Math.floor(img.width / this.numCols);
		this.rowSpacing = Math.floor(img.height / this.numRows);
		while(img.width % this.columnSpacing !== 0){this.columnSpacing = this.columnSpacing + 1}
		while(img.height % this.rowSpacing !== 0){this.rowSpacing = this.rowSpacing + 1}
		this.biggestMovement = Math.floor(this.biggestMovementPercentage * (((img.width + img.height) / 2) / 100));
		//alert(this.biggestMovement);
		this.betaInitialized = true;
	}
};

Panopticon.prototype.getMovementObject = function(img){
	//Reduce the resolution for both columns and for the rows.
	var selectedColumns = imgproc.bw.cols(img, this.columnSpacing);
	var selectedRows = imgproc.bw.rows(img, this.rowSpacing);

	var diffColumns = imgproc.generic.diffArr(selectedColumns, this.oldSelectedColumns);
	var diffRows = imgproc.generic.diffArr(selectedRows, this.oldSelectedRows);

	var importantColumns = imgproc.generic.mask(diffColumns, selectedColumns, this.threshhold)
	var importantRows = imgproc.generic.mask(diffRows, selectedRows, this.threshhold)
	//Get the differences for the columns
	if(importantColumns && this.oldImportantColumns){
		var shiftUp = imgproc.generic.shiftedArr(importantColumns, this.oldImportantColumns, this.biggestMovement, this.stepSearchSize, this.dampening);
		var avShiftUp = imgproc.generic.chunkify(shiftUp, this.requiredCols, this.minimumNoticedScrollDistance);

		var shiftSide = imgproc.generic.shiftedArr(importantRows, this.oldImportantRows, this.biggestMovement, this.stepSearchSize, this.dampening);
		var avShiftSide = imgproc.generic.chunkify(shiftSide, this.requiredRows, this.minimumNoticedScrollDistance);
	}
	var twistHoriz = -imgproc.generic.twistify(shiftSide, Math.round(this.requiredRows/2), this.minimumNoticedScrollDistance/2);
	var twistVert = imgproc.generic.twistify(shiftUp, Math.round(this.requiredCols/2), this.minimumNoticedScrollDistance/2);
	var twist = twistVert + twistHoriz

	if(!avShiftUp){avShiftUp = 0;}
	if(!avShiftSide){avShiftSide = 0;}
	if(!twist){twist = 0;}

	var movementObj = {
		top: -avShiftUp,
		left: avShiftSide,
		twist: twist
	}

	this.oldImportantColumns = deepCopy(importantColumns);
	this.oldImportantRows = deepCopy(importantRows);
	this.oldSelectedColumns = deepCopy(selectedColumns);
	this.oldSelectedRows = deepCopy(selectedRows);

	//if (this.showVideo){return imgproc.refl(img);}
	if (this.showVideo){
		var temp = document.getElementById(this.elementId);
		temp.width = img.width;
		temp.height = img.height;
		var context = temp.getContext('2d')
		var videoFrame = imgproc.bw.allToImg(importantColumns, importantRows, img.width, img.height, this.columnSpacing, this.rowSpacing);
		context.putImageData(videoFrame,0,0);
	}

	return movementObj;
};

