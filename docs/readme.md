# Name

useion - a modularization environment for use case driven and test driven modularization

# Synopsis

useion [OPTION]... PATH...

# Description

Synchronize changes between Markdown files and compiled or interpreted code at the level of static file processing, and enforce use case and test representations in code by displaying a use case or test step coverage.

Supported languages in this version are {%=o.supported_languages%}.

  -s, --synchronize         synchronize changes in PATH at start

  -w, --watch
      watch PATH for changes, synchronize them and print use case or test coverage

  -c, --use-case-coverage   calculate and print use case or test step coverage of all use cases and tests in PATH and exit (see also -s)

  -S, --server=PORT
      start web app at address <http://localhost:PORT/>, show use cases and code side by side, draw lines between them to indicate which use case steps are covered by which lines of code

  -i, --ignore=FILE
      with  -w, -c, -s: ignore words contained in FILE (one word per line) when calculating use case or test step coverage

  -p, --puml                generate and print PlantUML use case diagram and exit

  -g, --git=GIT_URL         show similarity between use cases and commits in GIT_URL

  -l=NUMBER                 with -g: process only NUMBER of commits

  --sl=NUMBER               with -g: skip NUMBER of commits

  --base_path=PATH          with -g: use different base code for calculating similarity

  -b, --base                print structure of code up to 3 levels

  --help                    print this help and exit

  --version                 print version information and exit

# Author

Written by Michal Bystricky.

# Copyright

Copyright © 2014 Free Software Foundation, Inc.  License GPLv3+: GNU GPL  version 3 or later <http://gnu.org/licenses/gpl.html>.
This  is  free software: you are free to change and redistribute it.  There is NO WARRANTY, to the extent permitted by law.

# See also

The full documentation for useion is available at <http://useion.com/>.
