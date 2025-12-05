/************************************************
 * test.js
 * Created at 2025. 12. 4. 오후 4:25:39.
 *
 * @author LCM
 ************************************************/



/*
 * "Button" 버튼(btn2)에서 click 이벤트 발생 시 호출.
 * 사용자가 컨트롤을 클릭할 때 발생하는 이벤트.
 */
function onBtn2Click2(e){
	var btn2 = e.control;
	app.lookup("cmb1").addItem(new cpr.controls.Item("label1","value1"));
}

/*
 * "Button" 버튼(btn1)에서 click 이벤트 발생 시 호출.
 * 사용자가 컨트롤을 클릭할 때 발생하는 이벤트.
 */
function onBtn1Click(e){

   testTypeError();

}

/*
 * "시나리오 에러" 버튼(btn3)에서 click 이벤트 발생 시 호출.
 * 사용자가 컨트롤을 클릭할 때 발생하는 이벤트.
 */
function onBtn3Click(e){
	var btn3 = e.control;
	runAllScenarioTests();
}
