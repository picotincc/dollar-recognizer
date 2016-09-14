var ws;
var ip = "localhost";
ws = new WebSocket("ws://" + ip + ":8080");
ws.onopen = function() {
    // Web Socket is connected, send data using send()

};
ws.onmessage = function(evt) {
    var received_msg = evt.data;
    console.log(received_msg);
    var received_msg_obj = JSON.parse(received_msg);
    switch (received_msg_obj.action) {
        case "loadLayout":
            break;
        default:
    }
};

ws.onclose = function() {
    // websocket is closed.
};

//
// Startup
//
var _isDown, _points, _strokeID, _r, _g, _rc; // global variables
function onLoadEvent()
{
    _points = new Array(); // point array for current stroke
    _strokeID = 0;
    _r = new PDollarRecognizer();

    var canvas = document.getElementById('myCanvas');
    _g = canvas.getContext('2d');
    _g.lineWidth = 3;
    _g.font = "16px Gentilis";
    _rc = getCanvasRect(canvas); // canvas rect on page
    _g.fillStyle = "rgb(255,255,136)";
    _g.fillRect(0, 0, _rc.width, 20);

    _isDown = false;
}
function getCanvasRect(canvas)
{
    console.log(canvas);
    var w = canvas.width;
    var h = canvas.height;

    var cx = canvas.offsetLeft;
    var cy = canvas.offsetTop;
    while (canvas.offsetParent != null)
    {
        canvas = canvas.offsetParent;
        cx += canvas.offsetLeft;
        cy += canvas.offsetTop;
    }
    console.log({x: cx, y: cy, width: w, height: h});
    return {x: cx, y: cy, width: w, height: h};
}
function getScrollY()
{
    var scrollY = 0;
    if (typeof(document.body.parentElement) != 'undefined')
    {
        scrollY = document.body.parentElement.scrollTop; // IE
    }
    else if (typeof(window.pageYOffset) != 'undefined')
    {
        scrollY = window.pageYOffset; // FF
    }
    return scrollY;
}
//
// Mouse Events
//
function mouseDownEvent(x, y, button)
{
    document.onselectstart = function() { return false; } // disable drag-select
    document.onmousedown = function() { return false; } // disable drag-select
    if (button <= 1)
    {
        _isDown = true;
        x -= _rc.x;
        y -= _rc.y - getScrollY();
        if (_strokeID == 0) // starting a new gesture
        {
            _points.length = 0;
            _g.clearRect(0, 0, _rc.width, _rc.height);
        }
        _points[_points.length] = new Point(x, y, ++_strokeID);
        drawText("Recording stroke #" + _strokeID + "...");
        var clr = "rgb(" + rand(0,200) + "," + rand(0,200) + "," + rand(0,200) + ")";
        _g.strokeStyle = clr;
        _g.fillStyle = clr;
        _g.fillRect(x - 4, y - 3, 9, 9);
    }
    else if (button == 2)
    {
        drawText("Recognizing gesture...");
    }
}
function mouseMoveEvent(x, y, button)
{
    if (_isDown)
    {
        x -= _rc.x;
        y -= _rc.y - getScrollY();
        _points[_points.length] = new Point(x, y, _strokeID); // append
        drawConnectedPoint(_points.length - 2, _points.length - 1);
    }
}
function mouseUpEvent(x, y, button)
{
    document.onselectstart = function() { return true; } // enable drag-select
    document.onmousedown = function() { return true; } // enable drag-select
    if (button <= 1)
    {
        if (_isDown)
        {
            _isDown = false;
            drawText("Stroke #" + _strokeID + " recorded.");
        }
    }
    else if (button == 2) // segmentation with right-click
    {
        if (_points.length >= 10)
        {
            var result = _r.Recognize(_points);
            drawText("Result: " + result.Name + " (" + round(result.Score,2) + ").");

            var gesObj = new Object();
            gesObj.action = "gesture";
            gesObj.points = _points;
            ws.send(JSON.stringify(gesObj));
        }
        else
        {
            drawText("Too little input made. Please try again.");
        }
        _strokeID = 0; // signal to begin new gesture on next mouse-down
    }
}
function drawConnectedPoint(from, to)
{
    _g.beginPath();
    _g.moveTo(_points[from].X, _points[from].Y);
    _g.lineTo(_points[to].X, _points[to].Y);
    _g.closePath();
    _g.stroke();
}
function drawText(str)
{
    _g.fillStyle = "rgb(255,255,136)";
    _g.fillRect(0, 0, _rc.width, 20);
    _g.fillStyle = "rgb(0,0,255)";
    _g.fillText(str, 1, 14);
}
function rand(low, high)
{
    return Math.floor((high - low + 1) * Math.random()) + low;
}
function round(n, d) // round 'n' to 'd' decimals
{
    d = Math.pow(10, d);
    return Math.round(n * d) / d
}
//
// Multistroke Adding and Clearing
//
function onClickAddExisting()
{
    if (_points.length >= 10)
    {
        var pointclouds = document.getElementById('pointclouds');
        var name = pointclouds[pointclouds.selectedIndex].value;
        var num = _r.AddGesture(name, _points);
        drawText("\"" + name + "\" added. Number of \"" + name + "\"s defined: " + num + ".");
        _strokeID = 0; // signal to begin new gesture on next mouse-down
    }
}
function onClickAddCustom()
{
    var name = document.getElementById('custom').value;
    if (_points.length >= 10 && name.length > 0)
    {
        var num = _r.AddGesture(name, _points);
        drawText("\"" + name + "\" added. Number of \"" + name + "\"s defined: " + num + ".");
        _strokeID = 0; // signal to begin new gesture on next mouse-down
        var custgesObj = new Object();
        custgesObj.action = "custGesture";
        custgesObj.points = _points;
        custgesObj.name = name;
        ws.send(JSON.stringify(custgesObj));
    }
}
function onClickCustom()
{
    document.getElementById('custom').select();
}
function onClickDelete()
{
    var num = _r.DeleteUserGestures(); // deletes any user-defined templates
    alert("All user-defined gestures have been deleted. Only the 1 predefined gesture remains for each of the " + num + " types.");
    _strokeID = 0; // signal to begin new gesture on next mouse-down
}
function onClickClearStrokes()
{
    _points.length = 0;
    _strokeID = 0;
    _g.clearRect(0, 0, _rc.width, _rc.height);
    drawText("Canvas cleared.");
}
