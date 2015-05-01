
var deepMap = function(arr, func){return arr.map(function(n){return Array.isArray(n) ? deepMap(n, func) : func(n); });};
var deepCopy = function(arr) {return deepMap(arr, function(n){return n});}
var average = function(arr){if (arr) { return arr.reduce(function(a,b){return a + b}, 0) / arr.length;} return null; }
var sizeOfLarger = function(arr, size) { return arr.filter(function(n){return n > size;}).length; }

function Panopticon(container, interval, options){

	this.onFrames = [];

	var self = this;
	this.initialized = false;

	//Basic settings--those you can set without knowing what the resolution of the camera will be.
	this.setAlphaSettings(options);

	var fh = new FrameHandler(container, interval, options);
	if(this.mode == 1){
		fh.onFrame(function(img){
			return self.perFrameFirstMode(img);
		});
	}else if(self.mode == 2){
		//fh.onFrame(perFrameSecondMode);
	}

}

Panopticon.prototype.onFrame = function(func){
	this.onFrames.push(func);
};

Panopticon.prototype.setAlphaSettings = function(options){
	//Basic settings
	//How many columns do we want to examine?
	this.numCols = options.numCols || 20;
	this.numRows = options.numRows || 10;
	//How many of these columns do we want to require to be moving, before anything moves?
	this.requiredCols = options.requiredCols || 4;
	this.requiredRows = options.requiredRows || 4;
	this.mode = options.mode || 1;

	//Slightly more advanced settings.
	//What's the biggest movement we anticipate, in per-percentage-of-screen distances?  Won't really work past 20%, probably.
	//This also takes up some serious time working.
	this.biggestMovementPercentage = options.biggestMovementPercentage || 10;
	this.dampening = options.dampening || 10;
	this.stepSearchSize = options.stepSearchSize || 1;
	this.minimumNoticedScrollDistance = options.minimumNoticedScrollDistance || 3;
	this.showVideo = options.showVideo || false;
};


Panopticon.prototype.initializer = function(img){
	if(img && img.width && img.height){
		this.resolutionCols = Math.floor(img.width / this.numCols);
		this.resolutionRows = Math.floor(img.height / this.numRows);
		while(img.width % this.resolutionCols !== 0){this.resolutionCols = this.resolutionCols + 1}
		while(img.height % this.resolutionRows !== 0){this.resolutionRows = this.resolutionRows + 1}
		this.biggestMovement = Math.ceil(this.biggestMovementPercentage * (((img.width + img.height) / 2) / 100));
		this.initialized = true;
	}
};


Panopticon.prototype.perFrameFirstMode = function(img){

	
	if(!this.initialized && !!img){ this.initializer(img);}
	//console.log(img);
	if(!this.resolutionRows || !this.resolutionCols){return;}

	

	//Reduce the resolution for both columns and for the rows.
	var toCols = imgproc.cols(this.oldImg, img, this.resolutionCols);
	var toRows = imgproc.rows(this.oldImg, img, this.resolutionRows);

	//Get the differences for the columns
	var shiftUp = imgproc.shiftedArr(this.oldCols, toCols, this.biggestMovement, this.stepSearchSize, this.dampening);
	var avShiftUp = imgproc.chunkify(shiftUp, this.requiredCols, this.minimumNoticedScrollDistance);

	var shiftSide = imgproc.shiftedArr(toRows, this.oldRows, this.biggestMovement, this.stepSearchSize, this.dampening);
	var avShiftSide = imgproc.chunkify(shiftSide, this.requiredRows, this.minimumNoticedScrollDistance);

	if(this.showVideo){
		var toReturn = imgproc.allToImg(toCols, toRows, img.width, img.height, this.resolutionCols, this.resolutionRows);
	}

	var obj = {up: avShiftUp,left: avShiftSide}

	for (var x = 0; x < this.onFrames.length; x++){
		//console.log(obj)
		this.onFrames[x](obj);
	}

	//postprocessing needed for stuff.
	//We need the old image, so we can product the next old cols.
	//And we need the old cols, which is actually the difference we had for this time.
	this.oldImg = imgproc.copy(img);
	this.oldCols = deepCopy(toCols);
	this.oldRows = deepCopy(toRows);

	if (this.showVideo){return toReturn || img;}
};









function blockShiftedArr(before, after, range, step){
	if(before && after){
		var length = before.length;
		for(var x = 0; x < length; x = x + step){
			shifted.push(shiftedSingle(before[x], after[x], range, step));
		}
		return shifted;
	}
}

function collapseAverage(arrOfArr){
	if(arrOfArr){
		var ret = [];
		for(var x = 0; x < arrOfArr[0].length; x++){
			var av = 0;
			for(var y = 0; y <  arrOfArr.length; y++){
				av = av + arrOfArr[y][x];
			}
			ret.push(av / arrOfArr.length);
		}
		return ret;
	}
	return null;
}

//This returns the difference between the two things passed in, but only in rows and columns spaced (aproximately)
//with width of steps.q



