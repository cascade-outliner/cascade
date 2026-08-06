import 'package:flutter/material.dart';

/// The Cascade brand palette and typography, mirrored from
/// `packages/theme/theme.css` (the web apps' single source of truth for
/// color tokens) so the mobile app reads as the same product rather than a
/// default Material app.
///
/// Only the built-in "Cascade Light"/"Cascade Dark" palette is ported here —
/// the premium palettes in `packages/theme/themes.ts` (Catppuccin, Nord,
/// Dracula, ...) are a settings feature the mobile app doesn't have yet.
class CascadeColors {
  const CascadeColors._();

  /// Page background (light) / primary text (dark).
  static const canvas = Color(0xFFFCF5EE);

  /// Surfaces & hover tints (light) / secondary text, borders (dark).
  static const surface = Color(0xFFF9E4D6);

  /// Danger / strong accent.
  static const danger = Color(0xFFAD4C4E);

  /// Muted text.
  static const muted = Color(0xFF62646B);

  /// Accent.
  static const accent = Color(0xFFE38B75);

  /// Primary text (light) / page background (dark).
  static const ink = Color(0xFF2B2D33);

  /// Primary action buttons.
  static const primary = Color(0xFFAD4C4E);
}

/// The font family bundled from `assets/fonts/` (see `pubspec.yaml`),
/// matching the `@fontsource-variable/bitter` package the web apps load —
/// see `packages/theme/fonts.ts`, where Bitter is the app's default font.
const cascadeFontFamily = 'Bitter';

/// Builds the light/dark `ThemeData` pair for `MaterialApp`. Only the
/// `canvas`/`ink` slots invert between the two, matching how the web apps'
/// `dark:` variants are applied per-component rather than through a second
/// full palette (see `theme.css`'s comment on theme palette slots).
class CascadeTheme {
  const CascadeTheme._();

  static ThemeData light() => _build(
    brightness: Brightness.light,
    background: CascadeColors.canvas,
    onBackground: CascadeColors.ink,
  );

  static ThemeData dark() => _build(
    brightness: Brightness.dark,
    background: CascadeColors.ink,
    onBackground: CascadeColors.canvas,
  );

  static ThemeData _build({
    required Brightness brightness,
    required Color background,
    required Color onBackground,
  }) {
    final colorScheme = ColorScheme(
      brightness: brightness,
      primary: CascadeColors.primary,
      onPrimary: CascadeColors.canvas,
      secondary: CascadeColors.accent,
      onSecondary: CascadeColors.ink,
      error: CascadeColors.danger,
      onError: CascadeColors.canvas,
      surface: background,
      onSurface: onBackground,
      surfaceContainerHighest: CascadeColors.surface,
      onSurfaceVariant: CascadeColors.muted,
      outline: CascadeColors.muted,
    );

    return ThemeData(
      useMaterial3: true,
      brightness: brightness,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: background,
      fontFamily: cascadeFontFamily,
      appBarTheme: AppBarTheme(
        backgroundColor: background,
        foregroundColor: onBackground,
        elevation: 0,
        titleTextStyle: TextStyle(
          fontFamily: cascadeFontFamily,
          color: onBackground,
          fontSize: 20,
          fontWeight: FontWeight.w600,
        ),
      ),
      floatingActionButtonTheme: FloatingActionButtonThemeData(
        backgroundColor: CascadeColors.primary,
        foregroundColor: CascadeColors.canvas,
      ),
      iconTheme: const IconThemeData(color: CascadeColors.muted),
      textSelectionTheme: const TextSelectionThemeData(cursorColor: CascadeColors.primary),
    );
  }
}
