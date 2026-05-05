# Home page `tm0` — steam-mode progress-bar fix

The temperature progress bar on the home page is a 100-frame flipbook
(`tGauge.pic`, frames 0–99). Originally the picture index was set to
`currentTemp` directly:

```
if(currentTemp<=99)
{
  tGauge.pic=currentTemp
}else if(currentTemp>=100)
{
  tGauge.pic=99
}
```

That accidentally looks roughly correct in brew mode (because brew
setpoints sit near 100, so "temperature in °C" ≈ "percent of target").
In **steam mode** it's broken: the bar pegs at frame 99 the moment
`currentTemp` reaches 99 °C and gives no visual feedback for the entire
99 → 155 climb to the steam setpoint.

## The fix

Scale `currentTemp` against the active setpoint and clamp to 0–99. The
same `tm0` event already resolves the brew-vs-steam target into `n5.val`
further down (the block under `// handling the target temperature aka
brew or steam`), so we reuse that and don't need to add globals or do
cross-page reads.

## What to change

In the home page's `tm0` timer event:

1. **Remove** the original `if(currentTemp<=99)` block (4 lines).
2. **Insert** the new block below, placed **after** the brew/steam target
   resolution so `n5.val` is fresh from the same tick.

New block:

```
// Picture-bar progress toward active setpoint (0..99)
if(n5.val>0)
{
  tempVar.val=currentTemp*99/n5.val
  if(tempVar.val>99)
  {
    tempVar.val=99
  }
  if(tempVar.val<0)
  {
    tempVar.val=0
  }
  tGauge.pic=tempVar.val
}else
{
  tGauge.pic=0
}
```

`tempVar.val` is safe to reuse here — the next reference to it in `tm0`
overwrites whatever we put in.

## Sanity check

| Mode  | setpoint | currentTemp | tGauge.pic    |
| ----- | -------- | ----------- | ------------- |
| brew  | 93       | 0           | 0             |
| brew  | 93       | 47          | 50            |
| brew  | 93       | 93          | 99 (full ✓)   |
| steam | 155      | 99          | 63            |
| steam | 155      | 155         | 99 (full ✓)   |
| steam | 155      | 160         | 99 (clamped)  |

## Full updated `tm0` (copy-paste-ready)

```
// Screen elements values display
covx currentTemp,tGauge.txt,0,0
covx dE.val,dNr.txt,0,0
tGauge.txt+="."
tGauge.txt+=dNr.txt
tGauge.txt+="°C"
//Water lvl handling
if(j0.val<=10)
{
  j0.pco=64171 //light blue
}else if(j0.val<=30)
{
  j0.pco=64520 // orange
}else
{
  j0.pco=22142 // red
}
// Brew handling
if(timerState==1&&modeSelect!=5&&modeSelect!=6&&modeSelect!=9)
{
  page brewGraph
}
// handling the warmup mode
tempVar.val=sT.setPoint.val-2
if(currentTemp>=tempVar.val&&numSec.val<=20)
{
  warmupState=0
}
if(warmupState==1&&numMin.val<15&&currentTemp>0)
{
  warmupPic.pic=136
  tempVar.val=numSec.val%2
  if(tempVar.val==0)
  {
    vis warmupPic,1
  }else
  {
    vis warmupPic,0
  }
}else if(warmupState==1&&numMin.val>=15&&currentTemp>tempVar.val)
{
  warmupPic.pic=135
  tempVar.val=numSec.val%2
  if(tempVar.val==0)
  {
    vis warmupPic,1
  }else
  {
    vis warmupPic,0
  }
}else
{
  vis warmupPic,0
}
// handling the target temperature aka brew or steam
if(targetState==0)
{
  n5.val=sT.setPoint.val
  vis steamPic,0
}else
{
  n5.val=sT.steamSetPoint.val
  if(currentTemp>135)
  {
    tempVar.val=numSec.val%2
    if(tempVar.val==0)
    {
      vis steamPic,1
    }else
    {
      vis steamPic,0
    }
  }
}
// Picture-bar progress toward active setpoint (0..99)
if(n5.val>0)
{
  tempVar.val=currentTemp*99/n5.val
  if(tempVar.val>99)
  {
    tempVar.val=99
  }
  if(tempVar.val<0)
  {
    tempVar.val=0
  }
  tGauge.pic=tempVar.val
}else
{
  tGauge.pic=0
}
// uptime handling
numSec.val=systemUpTime%60
numMin.val=systemUpTime/60%60
numHour.val=systemUpTime/3600
// Quick profiles long-press handling
if(btnPressed.val!=0)
{
  longPressCount.val+=tm0.tim
  if(longPressCount.val>=1000)
  {
    longPressCount.val=0
    keybdA.loadpageid.val=1
    keybdA.loadcmpid.val=btnPressed.val
    page keybdA
  }
}
//Mode handling
if(targetState==1)
{
  modeSelect=9 //steam mode
}else if(flushState==1)
{
  modeSelect=5 // flush mode
}else if(descaleState==1)
{
  modeSelect=6 // descale mode
}else if(ppManualState==1)
{
  modeSelect=3 //manual profiling mode
}else if(piState==0&&ppState==0)
{
  modeSelect=0 // default mode capped at 9bar
}else if(piState==1&&ppState==0)
{
  //loading the appropriate mode depending if flow or pressure ctrl is desired
  if(piFlowState==1)
  {
    modeSelect=7 // flow PI
  }else
  {
    modeSelect=1 // pressure PI
  }
}else if(piState==0&&ppState==1)
{
  //loading the appropriate mode depending if flow or pressure ctrl is desired
  if(ppType==1)
  {
    modeSelect=8 // flow PF
  }else
  {
    modeSelect=2 // pressure PF
  }
}else if(piState==1&&ppState==1)
{
  //loading the appropriate mode depending if flow or pressure ctrl is desired
  if(piFlowState==1&&ppType==0)
  {
    modeSelect=10 // flow PI -> pressure PF
  }else if(piFlowState==1&&ppType==1)
  {
    modeSelect=11 // flow PI -> flow PF
  }else if(piFlowState==0&&ppType==1)
  {
    modeSelect=12 // pressure PI -> flow PF
  }else
  {
    modeSelect=4 // pressure PI -> Pressure PF
  }
}else
{
  modeSelect=0 // in case all fails defaults to plain 9bar
}
```
