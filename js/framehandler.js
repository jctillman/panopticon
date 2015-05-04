//cluttering up the space of varriables, needlessly.



function FrameHandler(options){

	this.onFrames = [];
	var self = this;
	var interval = options.interval || 50;

	//var container = document.getElementById(id);
	var video = document.createElement('video');
	var hiddenCanvas = document.createElement('canvas');
	//var visibleCanvas = document.createElement('canvas');
	var hiddenContext = hiddenCanvas.getContext('2d');
	//var visibleContext = visibleCanvas.getContext('2d');

	//video.id = id + '_video';
	video.autoplay = 'true';
	//hiddenCanvas.id = id + '_hiddenCanvas';
	//visibleCanvas.id = id + '_visibleCanvas';

	var initialized = false;
	var vHeight, vWidth;
	var total = 0;
	var times = 0;
	var time = 0;

	//if (options.showVideo){ container.appendChild(visibleCanvas) };

	var handleVideo = function(stream){
		video.src =  window.URL.createObjectURL(stream);
	}

	var videoError = function(err){
		console.log("Something went wrong, not sure what.");
	}

	var initialize = function(){
		if (video.videoHeight){
			vHeight = video.videoHeight;
		    vWidth = video.videoWidth;
		    hiddenCanvas.width = vWidth;
		    hiddenCanvas.height = vHeight;
		    //size = vHeight * vWidth * 4;
		    //visibleCanvas.width = vWidth;
		    //visibleCanvas.height = vHeight;
		    initialized = true;
		    
		}
	}



	window.setInterval(function(){

		//Get epoch time in ms when we start going through, if doing verbose logging.
		if(options.verbose){ time = new Date().getTime(); }

		//If initialization hasn't already occurred.
		if (!initialized){initialize();}

		//Draw the image and put it into the img variable.
		hiddenContext.drawImage(video, 0,0, vWidth, vHeight);
		var img = hiddenContext.getImageData( 0, 0,vWidth, vHeight);

		for(var x = 0; x < self.onFrames.length; x++){
		 	self.onFrames[x](img);
		}

		//If we want to show the video, show it.
		//if (options.showVideo) { visibleContext.putImageData(img, 0,0); }

		//Calculate average time for each calculation, if doing verbose logging.
		if(options.verbose){
			var difference = (new Date().getTime() - time);
			total = total + difference;
			times++;
			var average = total / times;
			console.log(average);
		}


	}, interval);


	//Boilerplate for different browsers.  So bad.
	var nav = navigator.getUserMedia = navigator.getUserMedia || 
										navigator.webkitGetUserMedia ||
										navigator.mozGetUserMedia || 
										navigator.msGetUserMedia || 
										navigator.oGetUserMedia;

	//Call everything which has been prepared above.
	if (navigator.getUserMedia) { navigator.getUserMedia({video: true}, handleVideo, videoError);
	}else{throw new Error("This browser apparently does not support javascript webcam video.  Try Chrome.");}
}

FrameHandler.prototype.onFrame = function(func){
	this.onFrames.push(func);
}