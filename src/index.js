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
        case "result":
            drawText("Result: " + received_msg_obj.result.Name + " (" + round(received_msg_obj.result.Score,2) + ").");
            drawText("matched result: " + received_msg_obj.result.Name, _t);
            console.log(received_msg_obj.result, "path");
            drawResultPoint(received_msg_obj.result.path);
            break;
        case "init":
          var gestures = received_msg_obj.result;
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
var _isDown, _points, _strokeID, _r, _g, _t, _rc, _rt; // global variables
function onLoadEvent()
{
    _points = new Array(); // point array for current stroke
    _strokeID = 0;
    _r = new PDollarRecognizer();

    var canvas = document.getElementById('myCanvas');
    var resultCanvas = document.getElementById('resultCanvas');
    _g = canvas.getContext('2d');
    _g.lineWidth = 3;
    _g.font = "16px Gentilis";
    _t = resultCanvas.getContext('2d');
    _t.lineWidth = 3;
    _t.font = "16px Gentilis";
    _rc = getCanvasRect(canvas); // canvas rect on page
    _rt = getCanvasRect(resultCanvas); // canvas result
    drawText("please input: ", _g);
    drawText("matched result: ", _t);
    _isDown = false;
}
function getCanvasRect(canvas)
{
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
    console.log({x: cx, y: cy, width: w, height: h}, "坐标");
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
        _t.clearRect(0, 20, _rt.width, _rt.height);
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
            // var result = _r.Recognize(_points);
            // drawText("Result: " + result.Name + " (" + round(result.Score,2) + ").");
            // console.log(result);
            _t.clearRect(0, 0, _rt.width, _rt.height);
            // drawText("matched result: " + result.Name, _t);
            // drawResultPoint(result.path);

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

function drawResultPoint(points)
{
    var centerPoint = Centroid(points);
    var canvasCenterX = _rt.width / 2;
    var canvasCenterY = _rt.height / 2;
    var changeX = canvasCenterX - centerPoint.X;
    var changeY = canvasCenterY - centerPoint.Y;
    console.log(changeX,changeY);
    if (Array.isArray(points) && points.length > 1)
    {
        var index = 1;
        while(index < points.length)
        {
            if (points[index - 1].ID === points[index].ID)
            {
                _t.beginPath();
                _t.moveTo(points[index - 1].X + changeX, points[index - 1].Y + changeY);
                _t.lineTo(points[index].X + changeX, points[index].Y + changeY);
                _t.closePath();
                _t.stroke();
            }
            index ++;
        }
    }
}

function drawText(str, $_g = _g)
{
    $_g.clearRect(0, 0, _rc.width, 20);
    $_g.fillStyle = "rgb(255,255,136)";
    $_g.fillRect(0, 0, _rc.width, 20);
    $_g.fillStyle = "rgb(0,0,255)";
    $_g.fillText(str, 1, 14);
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
