#!/usr/bin/env perl
# One-shot sweep: add Tailwind `dark:` variants alongside common light-mode utilities.
# Designed to be idempotent — already-converted classes are skipped via a sentinel pattern.
# Run from repo root: perl scripts/apply-dark-mode.pl <files...>
#
# Conventions:
#   bg-white       -> + dark:bg-slate-900
#   bg-gray-50     -> + dark:bg-slate-950
#   bg-gray-100    -> + dark:bg-slate-800
#   text-gray-900  -> + dark:text-gray-100
#   text-gray-800  -> + dark:text-gray-100
#   text-gray-700  -> + dark:text-gray-300
#   text-gray-600  -> + dark:text-gray-300
#   text-gray-500  -> + dark:text-gray-400
#   text-gray-400  -> + dark:text-gray-500
#   text-gray-300  -> + dark:text-gray-600
#   border-gray-200-> + dark:border-slate-800
#   border-gray-100-> + dark:border-slate-800
#   border-gray-300-> + dark:border-slate-700
#   divide-gray-100-> + dark:divide-slate-800
#   divide-gray-200-> + dark:divide-slate-800
#   hover:bg-gray-50  -> + dark:hover:bg-slate-800/50
#   hover:bg-gray-100 -> + dark:hover:bg-slate-800
#
# Negative lookaheads block matches inside compound utilities like
#   bg-white/70   bg-gray-50/80   text-gray-900-foo   border-gray-200-something
# (i.e. followed by `/`, digit, or `-`).
use strict;
use warnings;

my @rules = (
  ['bg-white',         'dark:bg-slate-900'],
  ['bg-gray-50',       'dark:bg-slate-950'],
  ['bg-gray-100',      'dark:bg-slate-800'],
  ['hover:bg-gray-50', 'dark:hover:bg-slate-800/50'],
  ['hover:bg-gray-100','dark:hover:bg-slate-800'],
  ['text-gray-900',    'dark:text-gray-100'],
  ['text-gray-800',    'dark:text-gray-100'],
  ['text-gray-700',    'dark:text-gray-300'],
  ['text-gray-600',    'dark:text-gray-300'],
  ['text-gray-500',    'dark:text-gray-400'],
  ['text-gray-400',    'dark:text-gray-500'],
  ['text-gray-300',    'dark:text-gray-600'],
  ['border-gray-200',  'dark:border-slate-800'],
  ['border-gray-100',  'dark:border-slate-800'],
  ['border-gray-300',  'dark:border-slate-700'],
  ['divide-gray-100',  'dark:divide-slate-800'],
  ['divide-gray-200',  'dark:divide-slate-800'],
  ['text-neutral-700', 'dark:text-gray-300'],
  ['text-neutral-600', 'dark:text-gray-300'],
  ['text-neutral-500', 'dark:text-gray-400'],
  ['text-neutral-400', 'dark:text-gray-500'],
  ['bg-neutral-100',   'dark:bg-slate-800'],
  ['bg-neutral-50',    'dark:bg-slate-950'],
);

sub munge {
  my ($content) = @_;
  for my $r (@rules) {
    my ($from, $to) = @$r;
    my $from_re = quotemeta $from;
    my $to_re   = quotemeta $to;
    # Append $to after $from when:
    #   - $from is followed by space, quote, or end-of-string-line (boundary of a class string)
    #   - $from is NOT immediately followed by digit, /, or - (would be a different utility)
    #   - the token $to is NOT already present further along in the same class string
    $content =~ s{
      (?<=[\s"'`])          # PRECEDED by a class-list separator (so we don't
                            # match utilities prefixed by `dark:`, `hover:`, etc.)
      $from_re             # the light utility itself
      (?![\d/-])            # not extending into another token (e.g. bg-white/70)
      (?!\s+$to_re\b)       # not already followed by the dark variant
      (?=[\s"'`])           # followed by a class-list separator/terminator
    }{$from $to}gx;
  }
  return $content;
}

for my $file (@ARGV) {
  open my $fh, '<', $file or die "open $file: $!";
  local $/; my $orig = <$fh>; close $fh;

  my $next = munge($orig);

  # Idempotency: if the same rule has already been applied (e.g. `bg-white dark:bg-slate-900`
  # already exists), the regex above will still try to extend it again. Guard by checking
  # for the doubled pattern and stripping duplicates.
  for my $r (@rules) {
    my ($from, $to) = @$r;
    my $dup = quotemeta "$from $to $to";
    my $clean = "$from $to";
    $next =~ s/$dup/$clean/g;
  }

  if ($next ne $orig) {
    open my $w, '>', $file or die "write $file: $!";
    print $w $next;
    close $w;
    print "rewrote: $file\n";
  }
}
