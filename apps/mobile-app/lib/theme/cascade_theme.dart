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

  static const white = Color(0xFFFFFFFF);
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
    final outlinedBorder = OutlineInputBorder(
      borderRadius: BorderRadius.circular(14),
      borderSide: BorderSide(
        color: Color.lerp(background, onBackground, 0.14)!,
      ),
    );
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
      surfaceContainerHighest: Color.lerp(background, onBackground, 0.08)!,
      onSurfaceVariant: CascadeColors.muted,
      outline: Color.lerp(background, onBackground, 0.14)!,
    );

    return ThemeData(
      useMaterial3: false,
      brightness: brightness,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: background,
      splashColor: Colors.transparent,
      highlightColor: Colors.transparent,
      hoverColor: Colors.transparent,
      fontFamily: cascadeFontFamily,
      textTheme: Typography.material2021(platform: TargetPlatform.iOS).black
          .apply(
            bodyColor: onBackground,
            displayColor: onBackground,
            fontFamily: cascadeFontFamily,
          )
          .copyWith(
            headlineSmall: TextStyle(
              fontFamily: cascadeFontFamily,
              fontSize: 24,
              fontWeight: FontWeight.w600,
              color: onBackground,
            ),
            titleLarge: TextStyle(
              fontFamily: cascadeFontFamily,
              fontSize: 18,
              fontWeight: FontWeight.w600,
              color: onBackground,
            ),
            titleMedium: TextStyle(
              fontFamily: cascadeFontFamily,
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: onBackground,
            ),
            bodyMedium: TextStyle(
              fontFamily: cascadeFontFamily,
              fontSize: 14,
              height: 1.15,
              color: onBackground,
            ),
            bodySmall: TextStyle(
              fontFamily: cascadeFontFamily,
              fontSize: 12,
              height: 1.15,
              color: onBackground,
            ),
          ),
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
      cardTheme: CardThemeData(
        color: Color.lerp(
          background,
          CascadeColors.white,
          brightness == Brightness.light ? 0.92 : 0.06,
        ),
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(18),
          side: BorderSide(color: colorScheme.outline),
        ),
      ),
      iconTheme: const IconThemeData(color: CascadeColors.muted),
      dividerColor: colorScheme.outline,
      inputDecorationTheme: InputDecorationTheme(
        isDense: true,
        filled: true,
        fillColor: Color.lerp(
          background,
          CascadeColors.white,
          brightness == Brightness.light ? 0.85 : 0.05,
        ),
        hintStyle: TextStyle(
          fontFamily: cascadeFontFamily,
          fontSize: 13,
          color: CascadeColors.muted.withOpacity(0.72),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
        enabledBorder: outlinedBorder,
        focusedBorder: outlinedBorder.copyWith(
          borderSide: const BorderSide(
            color: CascadeColors.primary,
            width: 1.5,
          ),
        ),
        border: outlinedBorder,
      ),
      bottomSheetTheme: BottomSheetThemeData(
        backgroundColor: Colors.transparent,
        modalBackgroundColor: Colors.transparent,
        surfaceTintColor: Colors.transparent,
      ),
      textSelectionTheme: const TextSelectionThemeData(
        cursorColor: CascadeColors.primary,
      ),
    );
  }
}
