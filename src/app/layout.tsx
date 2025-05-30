"use client";

import { CacheProvider } from "@emotion/react";
import createEmotionCache from "../createEmotionCache";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { Container, AppBar, Toolbar, Typography, Box } from "@mui/material";
import theme from "../theme";

const clientSideEmotionCache = createEmotionCache();

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" dir="ltr">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>WSN Simulation Platform</title>
        <meta name="description" content="Wireless Sensor Network Simulation" />
      </head>
      <body style={{ fontFamily: theme.typography.fontFamily }}>
        <CacheProvider value={clientSideEmotionCache}>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <Container maxWidth="xl">{children}</Container>
          </ThemeProvider>
        </CacheProvider>
      </body>
    </html>
  );
}
