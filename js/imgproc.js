var arrayOfFill = function(length, fill){var arr = [];for (var x = 0; x < length; x++){arr.push(fill(x))}return arr;}
var deepMap = function(arr, func){return arr.map(function(n){return Array.isArray(n) ? deepMap(n, func) : func(n); });};
var deepCollapse = function(first, second, func){
 	return (Array.isArray(first))
 		? first.reduce(function(old, current, index){return old.concat([deepCollapse(first[index], second[index], func)]);},[])
 		: func(first, second);
 	};

var imgproc = {

	generic: {

		refl: function(imgDataA){
			if(!!imgDataA){
				var ret = new ImageData(imgDataA.width, imgDataA.height);
				var width = imgDataA.width;
				var height = imgDataA.height;
				var size = imgDataA.data.length;
				var dataA = imgDataA.data;
				var data = ret.data;
				for(var x = 0; x < size; x=x+4*width){
					for(var y = 0; y < width * 4; y=y+4){
						data[x-y+width*4  ] = dataA[x+y  ];
						data[x-y+width*4+1] = dataA[x+y+1];
						data[x-y+width*4+2] = dataA[x+y+2];
						data[x-y+width*4+3] = 255;
					}
				}
				return ret;
			}
		},

		diff: function (imgDataA, imgDataB){
			if(!!imgDataA && !!imgDataB){
				var ret = new ImageData(imgDataA.width, imgDataA.height);
				var dataA = imgDataA.data;
				var dataB = imgDataB.data;
				var data = ret.data;
				var size = imgDataA.data.length;
				for(var x = 0; x < size; x=x+4){
					data[x  ] = Math.abs(dataA[x  ] - dataB[x  ]);
					data[x+1] = Math.abs(dataA[x+1] - dataB[x+1]);
					data[x+2] = Math.abs(dataA[x+2] - dataB[x+2]);
					data[x+3] = 255;
				}
			}
			return ret;
		},

		copy: function(imgDataA){
			if(!!imgDataA){
				var ret = new ImageData(imgDataA.width, imgDataA.height);
				var size = imgDataA.data.length;
				var dataA = imgDataA.data;
				var data = ret.data;
				for(var x = 0; x < size; x=x+4){
					data[x  ] = dataA[x  ];
					data[x+1] = dataA[x+1];
					data[x+2] = dataA[x+2];
					data[x+3] = 255;
				}
				return ret;
			}
			return null;
		},

		mask: function(mask, real, threshold){
			if(!!mask && !!real){
				var ret = [];
				var length = mask.length;
				var iLength = mask[0].length;
				for(var x = 0; x < length; x++){
					ret.push([]);
					for(var y = 0; y < iLength; y++){
						ret[x].push((mask[x][y] > threshold) ? real[x][y] : 0);
					}
				}
				return ret;
				//See note below.
				//return deepCollapse(mask, real, function(a,b){
				//	return (a > threshold) ? b : 0;
				//});
			}	
		},

		diffArr: function(arrOne, arrTwo){
			if(!!arrOne && !!arrTwo){
				var ret = [];
				var length = arrOne.length;
				var iLength = arrOne[0].length;
				for(var x = 0; x < length; x++){
					ret.push([]);
					for(var y = 0; y < iLength; y++){
						ret[x].push(Math.abs(arrOne[x][y]-arrTwo[x][y]));
					}
				}
				return ret;
				//Not using this, even though it is much less verbose and much more readable, because it is, damnably, also much slower.
				// return deepCollapse(arrOne, arrTwo, function(a,b){
				// 	return Math.abs(a-b);
				// });
			}
		},

		chunkify: function(arr, many, limit){
			if(arr){
				var boringGone = arr.filter(function(n){return Math.abs(n) > limit});
				if (boringGone.length > many){
					return average(boringGone)
				}else{
					return 0;
				}
			}
			return 0;
		},

		twistify: function(arr, required, minimum){
			if (arr){
				var length = arr.length - required;
				var biggest = 0;
				for(var x = required; x < length; x++){
					var oneSide = arr.slice(0,x);
					var otherSide = arr.slice(x, arr.length);
					var one = imgproc.generic.chunkify(oneSide, required, minimum);
					var other = imgproc.generic.chunkify(otherSide, required, minimum);

					if (one < 0 && other > 0){
						var temp = Math.max((one),(other));
						biggest = biggest + temp;//(Math.abs(temp) > biggest) ? temp : biggest;
					}
					if (one > 0 && other < 0){
						var temp = Math.min((one),(other));
						biggest = biggest + temp;//(Math.abs(temp) > biggest) ? temp : biggest;
					}

				}
				return biggest / (length - required);
			}
		},

		shiftedArr: function(before, after, range, step, dampening){
			if(before && after){
				var length = before.length;
				var shifted = [];
				for(var x = 0; x < before.length; x = x + 1){
					shifted.push(this.shiftedSingle(before[x], after[x], range, step, dampening));
				}
				return shifted;
			}
			return null;
		},

		shiftedSingle: function(before, after, range, step, dampening){
			if(before && after){
				var smallestDiff = before.reduce(function(old, cur, index){ return old + Math.abs(before[index] - after[index])}) - before.length * dampening;
				var smallestIndex = 0;
				var length = before.length - range;
				for(var x = -range; x < range; x = x + step){
					var diffHere = 0;
					for(var y = range; y < length - range; y++){
						diffHere = diffHere + Math.abs(before[y] - after[y+x]);
					}
					if (diffHere < smallestDiff){
						smallestIndex = x;
						smallestDiff = diffHere;
					}
				}
				return smallestIndex;
			}
			return null;
		}

	},

	color: {

		//Takes imageData, imageData, and steps, and returns as many columns from that as 
		//one can make with the width between them of steps.
		cols: function(imgDataA, steps){
			if(!!imgDataA ){
				//Pulling misc data.
				var size = imgDataA.data.length;
				var width = imgDataA.width;
				var height = imgDataA.height;
				var dataA = imgDataA.data;
				
				//Vertical columns that we will attend to.
				//Build the array we will return.
				var cols = arrayOfFill( Math.ceil(width / steps) , function(){return []} );
				var currentCol = 0;
				var xStep = steps*4;
				var maxWidth = width / steps;
				for(var x = 0; x < size; x=x+xStep){
					var r = Math.abs(dataA[x  ]);
					var g = Math.abs(dataA[x+1]);
					var b = Math.abs(dataA[x+2]);
					cols[currentCol].push(r);
					cols[currentCol].push(g);
					cols[currentCol].push(b);
					currentCol++;
					if (currentCol >= maxWidth){currentCol = 0;}
				}
				//Returning it all.  Fix this later.
				return cols;
			}
			return null
		},

		//Takes imageData, imageData, and steps, and returns as many columns from that, greyscale, on a 0-765 scale, as 
		//one can make with the width between them of steps.
		rows: function(imgDataA, steps){
			if(!!imgDataA){
				//Pulling misc data.
				var size = imgDataA.data.length;
				var width = imgDataA.width;
				var height = imgDataA.height;
				var dataA = imgDataA.data;
				
				//Vertical columns that we will attend to.
				//Build the array we will return.
				var rows = [];
				var currentRow = 0;

				//For the loop specifically.
				var xStep = 4;
				var yStep = steps*4*width;
				var xSize = width * 4;
				var ySize = size;
				
				for(var y = 0; y < ySize; y=y+yStep){
					rows.push([]);
					for(var x = 0; x < xSize; x=x+xStep){
						var spot = x + y;
						var r = Math.abs(dataA[spot  ] );
						var g = Math.abs(dataA[spot+1] );
						var b = Math.abs(dataA[spot+2] );
						rows[currentRow].push(r);
						rows[currentRow].push(g);
						rows[currentRow].push(b);
					}
					currentRow++;
				}
				//Returning it all.  Fix this later.
				return rows;
			}
			return null
		},

		allToImg: function(cols, rows, width, height, stepsCols, stepsRows){

			var ret = new ImageData(width, height);
			var size = height * width * 4;
			var data = ret.data;

			if (cols){
				
				var currentCol = 0;
				var row = 0;
				var maxWidth = width / stepsCols;
				var xStep = stepsCols * 4;
				//console.log(cols);
				for(var x = 0; x < size; x=x+xStep){
					data[x  ] = cols[currentCol][row];
					data[x+1] = cols[currentCol][row+1];
					data[x+2] = cols[currentCol][row+2];
					data[x+3] = 255;

					currentCol++;
					if (currentCol >= maxWidth){currentCol = 0; row++;}
				}
			}

			if (rows){
				var yStep = 4 * width * stepsRows;
				var xStep = 4;
				var xSize = width * 4;
				var ySize = size;
				var row = 0;
				for(var y = 0; y < ySize; y = y + yStep){
					var col = 0;
					for(var x = 0; x < xSize; x = x + xStep){
						var spot = x + y;
						var val = Math.round(rows[row][col]/3);
						data[spot    ] = rows[row][col];
						data[spot + 1] = rows[row][col+1];
						data[spot + 2] = rows[row][col+2];
						data[spot + 3] = 255;
						col=col+3;	
					}
					row++;
				}
			}

			if (cols || rows){
				return ret;
			}else{
				return null;
			}
		}

	},


	bw: {
		//Takes imageData, imageData, and steps, and returns as many columns from that, greyscale, on a 0-765 scale, as 
		//one can make with the width between them of steps.
		cols: function(imgDataA, steps){
			if(!!imgDataA){
				//Pulling misc data.
				var size = imgDataA.data.length;
				var width = imgDataA.width;
				var height = imgDataA.height;
				var dataA = imgDataA.data;
				
				//Vertical columns that we will attend to.
				//Build the array we will return.
				var cols = arrayOfFill( Math.ceil(width / steps) , function(){return []} );
				var currentCol = 0;
				var xStep = steps*4;
				var maxWidth = width / steps;
				for(var x = 0; x < size; x=x+xStep){
					var r = dataA[x  ];
					var g = dataA[x+1];
					var b = dataA[x+2];
					cols[currentCol].push(r+g+b);
					currentCol++;
					if (currentCol >= maxWidth){currentCol = 0;}
				}
				//Returning it all.  Fix this later.
				return cols;
			}
			return null
		},


		rows: function(imgDataA, steps){
			if(!!imgDataA){
				//Pulling misc data.
				var size = imgDataA.data.length;
				var width = imgDataA.width;
				var height = imgDataA.height;
				var dataA = imgDataA.data;
				
				//Vertical columns that we will attend to.
				//Build the array we will return.
				var rows = [];
				var currentRow = 0;

				//For the loop specifically.
				var xStep = 4;
				var yStep = steps*4*width;
				var xSize = width * 4;
				var ySize = size;
				
				for(var y = 0; y < ySize; y=y+yStep){
					rows.push([]);
					for(var x = 0; x < xSize; x=x+xStep){
						var spot = x + y;
						var r = dataA[spot  ];
						var g = dataA[spot+1];
						var b = dataA[spot+2];
						rows[currentRow].push(r+g+b);
					}
					currentRow++;
				}
				return rows;
			}
			return null
		},


		allToImg: function(cols, rows, width, height, stepsCols, stepsRows){

			var ret = new ImageData(width, height);
			var size = height * width * 4;
			var data = ret.data;

			if (cols){
				
				var currentCol = 0;
				var row = 0;
				var maxWidth = width / stepsCols;
				var xStep = stepsCols * 4;
				//console.log(cols);
				for(var x = 0; x < size; x=x+xStep){
					var val = Math.round(cols[currentCol][row] / 3);
					data[x  ] = val;
					data[x+1] = val;
					data[x+2] = val;
					data[x+3] = 255;

					currentCol++;
					if (currentCol >= maxWidth){currentCol = 0; row++;}
				}
			}

			if (rows){
				var yStep = 4 * width * stepsRows;
				var xStep = 4;
				var xSize = width * 4;
				var ySize = size;
				var row = 0;
				for(var y = 0; y < ySize; y = y + yStep){
					var col = 0;
					for(var x = 0; x < xSize; x = x + xStep){
						var spot = x + y;
						var val = Math.round(rows[row][col]/3);
						data[spot    ] = val;
						data[spot + 1] = val;
						data[spot + 2] = val;
						data[spot + 3] = 255;
						col++;	
					}
					row++;
				}
			}

			if (cols || rows){
				return ret;
			}else{
				return null;
			}
		}


	}
}