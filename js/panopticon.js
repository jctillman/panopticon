
var deepMap = function(arr, func){return arr.map(function(n){return Array.isArray(n) ? deepMap(n, func) : func(n); });};
var deepCopy = function(arr) {return deepMap(arr, function(n){return n});}
var average = function(arr){if (arr) { return arr.reduce(function(a,b){return a + b}, 0) / arr.length;} return null; }
var sizeOfLarger = function(arr, size) { return arr.filter(function(n){return n > size;}).length; }

function Panopticon(container, interval, options){

	//Open up, and set basic settings.
	//Alpha settings--those you can set without knowing what the resolution of the camera will be
	//Beta settings get called when we first get data back from the camera.
	
	var self = this;
	this.onFrames = [];
	this.setAlphaSettings(options);

	var fh = new FrameHandler(container, interval, options);
	if(this.mode == 1){
		fh.onFrame(function(img){
			if(!self.betaInitialized && !!img){ self.setBetaSettings(img);}
			if(!self.resolutionRows || !self.resolutionCols){return;}
			return self.perFrameFirstMode(img);
		});
	}else if(self.mode == 2){
		fh.onFrame(function(img){
			if(!self.betaInitialized && !!img){ self.setBetaSettings(img);}
			if(!self.resolutionRows || !self.resolutionCols){return;}
			return self.perFrameSecondMode(img);
		});
	}

}

Panopticon.prototype.onFrame = function(func){
	this.onFrames.push(func);
};

Panopticon.prototype.setAlphaSettings = function(options){

	//Have no yet done beta initialization.
	this.betaInitialized = false;

	//How many columns do we want to examine?
	this.numCols = options.numCols || 20;
	this.numRows = options.numRows || 20;
	
	//How many of these columns do we want to require to be moving before anything moves.
	this.requiredCols = options.requiredCols || 4;
	this.requiredRows = options.requiredRows || 4;

	//Use mode 1, by default.
	this.mode = options.mode || 1;

	//Slightly more advanced settings.
	//What's the biggest movement we anticipate, in per-percentage-of-screen distances?  Won't really work past 20%, probably.
	//This also takes up some serious time working.
	this.biggestMovementPercentage = options.biggestMovementPercentage || 5;
	this.dampening = options.dampening || 150;
	this.stepSearchSize = options.stepSearchSize || 5;
	this.minimumNoticedScrollDistance = options.minimumNoticedScrollDistance || 3;
	this.showVideo = options.showVideo || false;
};


Panopticon.prototype.setBetaSettings = function(img){
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

	this.oldImg = imgproc.copy(img);
	this.oldCols = deepCopy(toCols);
	this.oldRows = deepCopy(toRows);

	if (this.showVideo){return imgproc.refl(img);}
	//if (this.showVideo){return toReturn || img;}
};


Panopticon.prototype.perFrameSecondMode = function(img){
	//Reduce the resolution for both columns and for the rows.
	var toCols = imgproc.cols(this.oldImg, img, this.resolutionCols);
	var toRows = imgproc.rows(this.oldImg, img, this.resolutionRows);

	//Get the differences for the columns
	var shiftUp = blockShiftedArr(this.oldCols, toCols, this.biggestMovement, this.stepSearchSize, this.dampening);
	var shiftSide = blockShiftedArr(this.oldRows, toRows, this.biggestMovement, this.stepSearchSize, this.dampening);
	
	if(this.showVideo){
		var toReturn = imgproc.allToImg(toCols, toRows, img.width, img.height, this.resolutionCols, this.resolutionRows);
	}

	var obj = {up: shiftUp,left: shiftSide}

	for (var x = 0; x < this.onFrames.length; x++){
		this.onFrames[x](obj);
	}

	this.oldImg = imgproc.copy(img);
	this.oldCols = deepCopy(toCols);
	this.oldRows = deepCopy(toRows);

	if (this.showVideo){return img;}
	//if (this.showVideo){return toReturn || img;}
};




function blockShiftedArr(before, after, range, step, dampening){
	if(before && after){
		var smallestDiff = blockShiftedArrAt(0, before, after, step) - before.length * dampening ;
		var smallestDiffIndex = 0;
		for(var x = -range; x < range; x = x + 1){
			var val = blockShiftedArrAt(x, before, after, range, step);
			if (val < smallestDiff){
				smallestDiff = val;
				smallestDiffIndex = x;
			}
		}
		return smallestDiffIndex;
	}
	return null;
}

function blockShiftedArrAt(offset, before, after, range, step){
	var amount = 0;
	var length = before[0].length - range;
	for (var x = 0; x < before.length; x++){
		for(var spot = range; spot < length; spot = spot + 1){
			amount = amount + (before[x][spot] - after[x][spot-offset])
		}
	}
	return amount;
}


//This returns the difference between the two things passed in, but only in rows and columns spaced (aproximately)
//with width of steps.q



