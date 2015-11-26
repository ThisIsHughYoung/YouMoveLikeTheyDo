
// a chunk is made up of 2 columns of 16x16 blocks
var defaultChunk = [
//	 0 1 2 3 4 5 6 7 8 9 A B C D
	[0,0,0,0,0,0,0,0,0,1,0,0,0,1,1],
	[0,0,0,0,0,0,0,0,0,0,0,0,0,1,1]
]
var defaultChunk2 = [
//	 0 1 2 3 4 5 6 7 8 9 A B C D E
	[0,0,0,0,0,0,0,0,0,1,0,0,0,1,1],
	[0,0,0,0,0,0,0,0,0,1,0,0,0,1,1]
]


world = {};

world[1] = {};

world[1][1] = {
	world: 1,
	stage: 1,
	
	bgColor: '#787CEC',
	
	palette1: 1,
	palette2: 1,
	palette3: 1,
	
	chunks: [
			defaultChunk2,
			defaultChunk,
			defaultChunk,
			defaultChunk,
			defaultChunk,
			defaultChunk,
			defaultChunk,
			defaultChunk,
			defaultChunk
		]
}

