// CustomText.js
import React from "react";
import { Text } from "react-native";

const CustomText = (props) => {
	return <Text {...props} style={[{ fontFamily: "aldrich" }, props.style]} />;
};

export default CustomText;
