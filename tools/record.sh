#!/bin/bash

if [ "$(uname)" == "Darwin" ]; then
    BASEDIR=$(dirname $0)
else
    BASEDIR=$(dirname $(readlink -f $0))
fi

DATADIR="$BASEDIR/../_data"
PLAYBACKDIR="$BASEDIR/../_playback"



if [ ! -f "$DATADIR/$1.yaml" ]; then
    echo "file not found"
    exit
fi

SERVER="http://beta.commandlinefu.cn";
tmp_folder=`mktemp -d`;
trap 'rm -rf $tmp_folder' EXIT INT TERM HUP
type_file="$tmp_folder/script";
timing_file="$tmp_folder/timing";
meta_file="$tmp_folder/meta";

zip_file="$tmp_folder/upload.zip";
response_file="$tmp_folder/response";
term_w=`tput cols`;
term_h=`tput lines`;
if [ $term_w -gt 80 ] || [ $term_h -gt 24 ]
then
    echo "Your terminal is too large ($term_w x $term_h) to make a record, please resize your terminal window to 80 x 24 or below.";
#    exit;
fi
echo "Start recording... DO NOT resize your terminal window!";
echo "Press 'Ctrl + D' when finish";
script $type_file -t 2> $timing_file -q;
echo "$term_w $term_h" > $meta_file;
zip -jq $zip_file $type_file $timing_file $meta_file;

mv $zip_file $DATADIR/$1.zip

if [ -z "$EDITOR" ]; then
    EDITOR='/usr/bin/editor'
fi

$EDITOR $DATADIR/$1.yaml 


