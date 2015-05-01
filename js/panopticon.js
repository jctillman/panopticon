
var deepMap = function(arr, func){return arr.map(function(n){return Array.isArray(n) ? deepMap(n, func) : func(n); });};
var deepCopy = function(arr) {return deepMap(arr, function(n){return n});}
var average = function(arr){if (arr) { return arr.reduce(function(a,b){return a + b}, 0) / arr.length;} return null; }
var sizeOfLarger = function(arr, size) { return arr.filter(function(n){return n > size;}).length; }

function Panopticon(container, interval, options){

	this.onFrames = [];
	var self = this;
	var initialized = false;
	var resolutionCols, resolutionRows, biggestMovement, oldImg, oldCols, oldRows

	//Basic settings
	//How many columns do we want to examine?
	var numCols = options.numCols || 20;
	var numRows = options.numRows || 10;
	//How many of these columns do we want to require to be moving, before anything moves?
	var requiredCols = options.requiredCols || 4;
	var requiredRows = options.requiredRows || 4;
	var mode = options.mode || 1;

	//Slightly more advanced settings.
	//What's the biggest movement we anticipate, in per-percentage-of-screen distances?  Won't really work past 20%, probably.
	//This also takes up some serious time working.
	var biggestMovementPercentage = options.biggestMovementPercentage || 10;
	var dampening = options.dampening || 10;
	var stepSearchSize = options.stepSearchSize || 1;
	var minimumNoticedScrollDistance = options.minimumNoticedScrollDistance || 3;

	var initialize = function(img){
		if(img && img.width && img.height){
			resolutionCols = Math.floor(img.width / numCols);
			resolutionRows = Math.floor(img.height / numRows);
			while(img.width % resolutionCols !== 0){resolutionCols = resolutionCols + 1}
			while(img.height % resolutionRows !== 0){resolutionRows = resolutionRows + 1}
			biggestMovement = Math.ceil(biggestMovementPercentage * (((img.width + img.height) / 2) / 100));
			initialized = true;
		}
	}

	var perFrameFirstMode = function(img){

		if(!initialized && !!img){initialize(img);}

		if(!resolutionRows || !resolutionCols){return;}

		//console.log(resolutionCols, resolutionRows)

		//Reduce the resolution for both columns and for the rows.
		var toCols = imgproc.cols(oldImg, img, resolutionCols);
		var toRows = imgproc.rows(oldImg, img, resolutionRows);

		//Get the differences for the columns
		var shiftUp = imgproc.shiftedArr(oldCols, toCols, biggestMovement, stepSearchSize, dampening);
		var avShiftUp = imgproc.chunkify(shiftUp, requiredCols, minimumNoticedScrollDistance);

		var shiftSide = imgproc.shiftedArr(toRows, oldRows, biggestMovement, stepSearchSize, dampening);
		var avShiftSide = imgproc.chunkify(shiftSide, requiredRows, minimumNoticedScrollDistance);

		if(options.showVideo){
			var toReturn = imgproc.allToImg(toCols, toRows, img.width, img.height, resolutionCols, resolutionRows);
		}

		var obj = {up: avShiftUp,left: avShiftSide}

		for (var x = 0; x < self.onFrames.length; x++){
			self.onFrames[x](obj);
		}

		//postprocessing needed for stuff.
		//We need the old image, so we can product the next old cols.
		//And we need the old cols, which is actually the difference we had for this time.
		oldImg = imgproc.copy(img);
		oldCols = deepCopy(toCols);
		oldRows = deepCopy(toRows);

		if (options.showVideo){return toReturn || img;}
	};


	var fh = new FrameHandler(container, interval, options);
	if(mode == 1){
		fh.onFrame(perFrameFirstMode);
	}else if(mode == 2){
		fh.onFrame(perFrameSecondMode);
	}
}

Panopticon.prototype.onFrame = function(func){
	this.onFrames.push(func);
}











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



