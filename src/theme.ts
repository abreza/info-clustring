import { createTheme } from "@mui/material/styles";
import { Vazirmatn } from "next/font/google";

const vazirmatn = Vazirmatn({
  weight: ["300", "400", "500", "700"],
  subsets: ["arabic"],
  display: "swap",
});

const theme = createTheme({
  // direction: "rtl",
  // typography: {
  //   fontFamily: vazirmatn.style.fontFamily,
  //   h1: {
  //     fontWeight: 700,
  //   },
  //   h2: {
  //     fontWeight: 700,
  //   },
  //   h3: {
  //     fontWeight: 500,
  //   },
  //   h4: {
  //     fontWeight: 500,
  //   },
  //   h5: {
  //     fontWeight: 500,
  //   },
  //   h6: {
  //     fontWeight: 500,
  //   },
  //   button: {
  //     fontWeight: 500,
  //   },
  // },
  // palette: {
  //   primary: {
  //     main: "#1976d2",
  //   },
  //   secondary: {
  //     main: "#dc004e",
  //   },
  // },
});

export default theme;
