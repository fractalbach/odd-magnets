
console.log('hello')
const q = document.querySelector.bind(document);
const GAME_WIDTH = 1000;
const GAME_HEIGHT = 1000;
const FRICTION = 0.01;
const FRICTION_VEL = 0.01;
const MAX_ELECTRIC_FORCE = 10;
const KCONSTANT = 2;
const MAX_ACCELERATION = 10;

const canvas = q('#game')
const ctx = canvas.getContext('2d')
ctx.lineCap = 'round'
ctx.lineWidth = 2
ctx.strokeStyle = 'rgba(0,0,0,1)'

Math['randint'] = function(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

Math['randfloat'] = function(min, max) {
    return Math.random() * (max - min) + min;
}

class Vector {
    constructor(arr) {
	this.arr = arr
    }
    len() {
	let acc = 0;
	for (let cur of this.arr) {
	    acc += cur*cur
	}
	return Math.sqrt(acc)
    }
    unit() {
	let len = this.len()
	return new Vector(this.arr.map((cur) => cur/len))
    }
    get(i) {
	return this.arr[i]
    }
}


Math['unitVector'] = function(arr) {
    return (new Vector(arr)).unit().arr
}

class Ball {
    constructor() {
	this.fill = `rgba(200, 0, 0, 0.1)`
	this.pos = [0,0,0]
	this.r = 10
	this.a = [0,0,0]
	this.v = [0,0,0]
	this.m = 1
	this.q = 1
	this.F_x = 0
	this.F_y = 0
    }
    static NewRandom() {
	let b = new Ball()
	let rx = Math.randint(0, GAME_WIDTH)
	let ry = Math.randint(0, GAME_HEIGHT)
	let rax = Math.randfloat(0, 1)
	let ray = Math.randfloat(0, 1)
	b.pos = [rx, ry, 0]
	b.a = [rax, ray, 0]
	//b.q = Math.random()>0.5? 1 : -1
	b.q = Math.randfloat(-1, 1)
	b.m = Math.randint(-1, 1)
	let red =  255 * b.q
	let blue = -255 * b.q
	let green = 255 * (1 - Math.abs(b.q))

	// let red = Math.randint(0, 200)
	// let green = Math.randint(0, 200)
	// let blue = Math.randint(0, 200)
	b.fill = `rgba(${red},${green},${blue},0.9)`
	return b
    }
    get x() { return this.pos[0] }
    get y() { return this.pos[1] }
    get z() { return this.pos[2] }
    draw (ctx) {
	ctx.fillStyle = this.fill
	ctx.beginPath()
	ctx.arc(this.x, this.y, this.r, 0, 2*Math.PI, true)
	ctx.fill()
	// ctx.beginPath()
	// ctx.arc(this.x, this.y, this.r, 0, 2*Math.PI, true)
	// ctx.stroke()
    }
}

const Scene = (function(){
    let objects = [];
    function add(obj) {
	objects.push(obj)
    }
    function step(obj) {
	for (let o of objects) {
	    // 
	    // naively calculate magnetic force from all other balls
	    //
	    let F_x_sum = 0
	    let F_y_sum = 0
	    let s = ''
	    for (let o2 of objects) {
		if (o == o2) { continue }
		let x = o2.pos[0] - o.pos[0]
		let y = o2.pos[1] - o.pos[1]
		let q1 = o.q
		let q2 = o2.q
		let r_squared =  (x*x + y*y) / 100
		if (r_squared < 10) { r_squared = 10 }
		let r = Math.sqrt(r_squared)
		let F_mag =  KCONSTANT * -q1 * q2 / (r_squared)
		let r_hat_x = x/r
		let r_hat_y = y/r
		let F_x = F_mag * r_hat_x
		let F_y = F_mag * r_hat_y
		// s += `[${F_x}, ${F_y}] + `
		F_x_sum += (F_x===NaN? 0 : F_x)
		F_y_sum += (F_y===NaN? 0 : F_y)
	    }
	    //
	    // put a limit on the electric force magnitude so it doesn't get out of hand.
	    //
	    if (Math.abs(F_x_sum) > MAX_ELECTRIC_FORCE) {
		F_x_sum = Math.sign(F_x_sum) * MAX_ELECTRIC_FORCE
	    }
	    if (Math.abs(F_y_sum) > MAX_ELECTRIC_FORCE) {
		F_y_sum = Math.sign(F_y_sum) * MAX_ELECTRIC_FORCE
	    }
	    //
	    // save the force value, make sure not to update it immediately, and instead
	    // wait until all of the forces have been calculated.  Otherwise, you end up
	    // with strange effects because balls will be moving while you still trying to
	    // calculate the force.
	    //
	    o.Fx = F_x_sum
	    o.Fy = F_y_sum
	}
	for (let o of objects) {
	    //
	    // adjust acceleration due to magnetic force
	    //
	    o.a[0] = o.Fx
	    o.a[1] = o.Fy
	    //
	    // draw some fun vectors on the screen to show what's going on
	    //
	    let endpoint_x = o.x + o.Fx * 10
	    let endpoint_y = o.y + o.Fy * 10
	    ctx.beginPath()
	    ctx.moveTo(o.x, o.y)
	    ctx.lineTo(endpoint_x, endpoint_y)
	    ctx.stroke()
	    //
	    // update velocity and position vectors.
	    //
	    for (let i=0; i<2; i++) {
		if (Math.abs(o.a[i]) < FRICTION) {
		    o.a[i] = 0
		}
		o.a[i] -= Math.sign(o.a[i]) * FRICTION
		o.v[i] -= Math.sign(o.v[i]) * FRICTION_VEL
		o.v[i]   += o.a[i]
		o.pos[i] += o.v[i]
	    }
	    forceBounceWall(o)
	}
    }
    function fieldAt(o) {
    }
    function squaredDistance(o1, o2) {
	let x = o2.pos[0] - o1.pos[0]
	let y = o2.pos[1] - o1.pos[1]
	let z = o2.pos[2] - o2.pos[2]
	return x*x + y*y + z*z
    }
    function forceBounceWall(o) {
	if ((o.x > GAME_WIDTH) || (o.x < 0)) {
	   o.a[0] = -o.a[0]
	   o.v[0] = -o.v[0]
	}
	if (o.pos[1] > GAME_HEIGHT || o.pos[1] < 0) {
	    o.a[1] = -o.a[1]
	    o.v[1] = -o.v[1]
	}
    }
    function drawAll(ctx) {
	for (let o of objects) {
	    o.draw(ctx)
	}
    }
    return {
	add,
	step,
	drawAll,
	objects,
    }
}());

function clearCanvas(ctx) {
    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT)
}

function clearCanvasFadeout(ctx) {
    ctx.fillStyle = 'rgba(255,255,255, 0.2)'
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)
}

// main function
const game = (function(){
    for (let i=0; i<1000; i++) {
	Scene.add(Ball.NewRandom())
    }
    function loop(timestamp) {
	Scene.step()
	// clearCanvas(ctx)
	clearCanvasFadeout(ctx)
	Scene.drawAll(ctx)
	window.requestAnimationFrame(loop)
    }
    window.requestAnimationFrame(loop)
}())
