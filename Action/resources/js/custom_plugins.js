(function($) {
					$.fn.elasticScroll = function(option){
						(function(target){
							$(target)[0].elasticScrollOption = option;
							var isInScroll = false;
							
							$(target).bind("scroll",function(){
								isInScroll = true;
							});
							$(target).bind("touchend mouseup",function(){
								//if(isInScroll)
								{
									var elementHeight = $($(option.elementSelector)[0]).outerHeight();
									var modHeight = target[0].scrollTop%elementHeight;
									
									
									var currentScrollTop = (target[0].scrollTop) + 
														  ((modHeight > elementHeight*0.5) ? (elementHeight-modHeight) : (-modHeight));
									currentScrollTop -= currentScrollTop%elementHeight;
									
									if( currentScrollTop != target[0].scrollTop)
										$(target[0]).clearQueue().animate({scrollTop : currentScrollTop},"fast","swing");
									//target[0].scrollTop = currentScrollTop;
									
									isInScroll = false;
									
									if(option.onSelected) 
										option.onSelected( $(target).find(option.elementSelector) [ Math.floor(currentScrollTop / elementHeight)] );
								}
							});
						})(this);	
					};
					$.fn.elasticScrollShowElement = function(index){
						$(this)[0].scrollTop = $($($(this)[0].elasticScrollOption.elementSelector)[0]).outerHeight() * index;
						
						var option = $(this)[0].elasticScrollOption;
						if(option.onSelected) 
							option.onSelected( $(this).find(option.elementSelector)[index]);
								
					};
					
				})(jQuery);
				(function($){
					function eventToDotIndex(dotWidth,dotHeight,e){
						return Math.ceil(e.pageX / dotWidth) + 
							   (Math.ceil(e.pageY / dotHeight) - 1) * 3;
					}
					function drawLine(startIndex,endIndex){
						
					}
					
					
					$.fn.setLineStartPos = function(pos,excludeOffset){
						if(excludeOffset){
							var parrentOffset = $(this).parent().offset();
							pos.left -= parrentOffset.left;
							pos.top  -= parrentOffset.top;
						}
						this.attr({
							x1 : pos.left,
							y1 : pos.top
						});
					};
					$.fn.setLineEndPos = function(pos,excludeOffset){
						if(excludeOffset){
							var parrentOffset = $(this).parent().offset();
							pos.left -= parrentOffset.left;
							pos.top  -= parrentOffset.top;
						}
						this.attr({
							x2 : pos.left,
							y2 : pos.top
						});
					}; 
					$.fn.patternLock = function(option){
						(function(target){
							var currentPattern = [];		
							var lastDotIndex = null;
							var lastDot = null;
							var targetingLine = null; 
							
							
							var touchStarted = false;
							
							$(target).bind("touchstart mousedown",function(e){
								currentPattern	 = [];
								lastDotIndex = null;
								lastDot = null;
								touchStarted = true;
										
								this.trigger("touchmove");
								this.trigger("mousemove");
								
								return false;
							});
							
							$(target).bind("touchmove mousemove",function(e){
								if (! touchStarted)
									return true;
								
								var touchbleDots = $($(target).find(option.elementSelector));
								var newDotIndex = eventToDotIndex($(this).width()/3,$(this).height()/3,e.originalEvent);
								var newDot = touchbleDots[newDotIndex - 1] //해당하는 닷에 마우스가 충돌했는지 검사한다.
								
								if(newDot && $(newDot).hitTest(e.originalEvent.pageX, e.originalEvent.pageY)){
									if(newDotIndex != lastDotIndex && currentPattern.indexOf(newDotIndex) < 0)
									{
										console.log(newDotIndex);
										currentPattern.push(newDotIndex);
										//이미 지난경우
										if(lastDot)
										{
											var prevDotPos = $(lastDot).centerPos();
											var currentDotPos = $(newDot).centerPos();
											
											var newLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
											$(".line-overlay")[0].appendChild(newLine);
											$(newLine).setLineStartPos(prevDotPos,true);
											$(newLine).setLineEndPos(currentDotPos,true);
											//이전점과 새점을 잇는 선을 긋고,
											
											//타겟팅 라인의 시작점을 바꾼다.
											$(targetingLine).setLineStartPos(currentDotPos,false);
										}
										else {
											//닷을 처음 선택한경우
											var dotPos = $(newDot).centerPos();
											targetingLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
											$(".line-overlay")[0].appendChild(targetingLine);
											$(targetingLine).setLineStartPos(dotPos,true);
											$(targetingLine).setLineEndPos(dotPos,true);
											
										}
										if(option.onElementSelected)
											option.onElementSelected(newDot);
											
										lastDot = newDot;
										lastDotIndex = newDotIndex;
									}
								}
								
								if(targetingLine)
								{
									var svgPos = $(target).offset();
									$(targetingLine).setLineEndPos({ 
										left : e.originalEvent.pageX,
										top  : e.originalEvent.pageY
									},true);
									console.log(targetingLine);
								}
								
								return false;
							});
							$(target).bind("touchend mouseup",function(e){
								if(touchStarted)
								{
									console.log(currentPattern);
									option.onTryToUnlock(currentPattern);
									if(targetingLine)
									{
										$(targetingLine).remove();
									}
									touchStarted = false;
								}
							});	
						})(this);
					};
					
					
					$.fn.hitTest = function(x, y){
					    var bounds = this.offset();
					    bounds.right = bounds.left + this.outerWidth();
					    bounds.bottom = bounds.top + this.outerHeight();
					    return x >= bounds.left && 
				    		   x <= bounds.right &&
				    		   y <= bounds.bottom &&
				    		   y >= bounds.top;
				    };
				    $.fn.centerPos = function(){ 
				    	var bounds = this.offset(); 
				    	bounds.left += this.outerWidth()  * 0.5;
				 	  	bounds.top  += this.outerHeight() * 0.5;
				    	return bounds;
					};
				})(jQuery);	