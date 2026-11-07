import 'package:flutter/material.dart';

@immutable
class CascadeColors extends ThemeExtension<CascadeColors> {
  const CascadeColors({
    required this.canvas,
    required this.surface,
    required this.ink,
    required this.muted,
    required this.placeholder,
    required this.primary,
    required this.onPrimary,
    required this.primaryMuted,
    required this.border,
    required this.borderStrong,
    required this.inkSubtle,
    required this.inkSubtleHover,
    required this.info,
    required this.infoMuted,
    required this.accent,
    required this.danger,
    required this.highlight,
  });

  final Color canvas;
  final Color surface;
  final Color ink;
  final Color muted;
  final Color placeholder;
  final Color primary;
  final Color onPrimary;
  final Color primaryMuted;
  final Color border;
  final Color borderStrong;
  final Color inkSubtle;
  final Color inkSubtleHover;
  final Color info;
  final Color infoMuted;
  final Color accent;
  final Color danger;
  final Color highlight;

  static const light = CascadeColors(
    canvas: Color(0xFFF0F0F0),
    surface: Color(0xFFFFFFFF),
    ink: Color(0xFF192036),
    muted: Color(0xFF5B6072),
    placeholder: Color(0xFF8C909C),
    primary: Color(0xFF192036),
    onPrimary: Color(0xFFF0F0F0),
    primaryMuted: Color(0x14192036),
    border: Color(0x33192036),
    borderStrong: Color(0xFF192036),
    inkSubtle: Color(0x14192036),
    inkSubtleHover: Color(0x29192036),
    info: Color(0xFF0177BB),
    infoMuted: Color(0x1A0177BB),
    accent: Color(0xFFD65B5C),
    danger: Color(0xFFD65B5C),
    highlight: Color(0xFF50216A),
  );

  static const dark = CascadeColors(
    canvas: Color(0xFF192036),
    surface: Color(0xFF222A44),
    ink: Color(0xFFF0F0F0),
    muted: Color(0xFFA9ADBA),
    placeholder: Color(0xFF6E748A),
    primary: Color(0xFFF0F0F0),
    onPrimary: Color(0xFF192036),
    primaryMuted: Color(0x1FF0F0F0),
    border: Color(0x33F0F0F0),
    borderStrong: Color(0xFFF0F0F0),
    inkSubtle: Color(0x14F0F0F0),
    inkSubtleHover: Color(0x29F0F0F0),
    info: Color(0xFF6CB8EA),
    infoMuted: Color(0x246CB8EA),
    accent: Color(0xFFD65B5C),
    danger: Color(0xFFE8807F),
    highlight: Color(0xFFC9A6DC),
  );

  @override
  CascadeColors copyWith() => this;

  @override
  CascadeColors lerp(CascadeColors? other, double t) {
    if (other == null) return this;
    Color l(Color a, Color b) => Color.lerp(a, b, t)!;
    return CascadeColors(
      canvas: l(canvas, other.canvas),
      surface: l(surface, other.surface),
      ink: l(ink, other.ink),
      muted: l(muted, other.muted),
      placeholder: l(placeholder, other.placeholder),
      primary: l(primary, other.primary),
      onPrimary: l(onPrimary, other.onPrimary),
      primaryMuted: l(primaryMuted, other.primaryMuted),
      border: l(border, other.border),
      borderStrong: l(borderStrong, other.borderStrong),
      inkSubtle: l(inkSubtle, other.inkSubtle),
      inkSubtleHover: l(inkSubtleHover, other.inkSubtleHover),
      info: l(info, other.info),
      infoMuted: l(infoMuted, other.infoMuted),
      accent: l(accent, other.accent),
      danger: l(danger, other.danger),
      highlight: l(highlight, other.highlight),
    );
  }
}

extension CascadeTheme on BuildContext {
  CascadeColors get colors => Theme.of(this).extension<CascadeColors>()!;
}

ThemeData buildTheme(Brightness brightness) {
  final c = brightness == Brightness.dark ? CascadeColors.dark : CascadeColors.light;
  final base = ThemeData(
    useMaterial3: true,
    fontFamily: 'Onest',
    brightness: brightness,
    colorScheme: ColorScheme.fromSeed(
      seedColor: const Color(0xFF192036),
      brightness: brightness,
      primary: c.primary,
      onPrimary: c.onPrimary,
      surface: c.surface,
      onSurface: c.ink,
      error: c.danger,
    ),
    scaffoldBackgroundColor: c.canvas,
    extensions: [c],
  );
  return base.copyWith(
    textTheme: base.textTheme.apply(bodyColor: c.ink, displayColor: c.ink),
    dividerColor: c.border,
    textSelectionTheme: TextSelectionThemeData(
      cursorColor: c.info,
      selectionColor: c.infoMuted,
      selectionHandleColor: c.info,
    ),
    bottomSheetTheme: BottomSheetThemeData(
      backgroundColor: c.surface,
      surfaceTintColor: Colors.transparent,
      showDragHandle: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
    ),
    dialogTheme: DialogThemeData(backgroundColor: c.surface, surfaceTintColor: Colors.transparent),
    snackBarTheme: SnackBarThemeData(
      backgroundColor: c.primary,
      contentTextStyle: TextStyle(color: c.onPrimary),
      behavior: SnackBarBehavior.floating,
    ),
  );
}
