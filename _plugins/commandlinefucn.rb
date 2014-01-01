require 'rake'
require "zip/zip"
require 'fileutils'
module Jekyll


    class CommandLinePost < Post
        

        def toname(x)
            x = x.downcase.gsub(/[^a-z0-9]/, "_").gsub(/_{2,}/, "_").gsub(/(^[_]*)|([_]*$)/, "")
            x[0..68]
        end

        def initialize(site, source, d)

            @command_data = d

            @slug = toname(d['command'])
            dir = @slug.split('_')[0]

            super(site, source, "/" + dir, d['summary'])

            self.date = d['date']
            self.ext = ".html"

        end

        def process(name)
        end

        def read_yaml(base, name, opts = {})
            self.content = @command_data['command']
            self.slug = @slug
            self.data = @command_data
            self.data['layout'] = 'command'
            self.data['tags'] = @slug.split('_').delete_if { | x | x.empty? }
            self.extracted_excerpt = self.extract_excerpt
        end

        def title
            @name
        end

        def template
            '/commands/:categories/:title.html'
        end

    end

    
    class CommandPostGenerator < Generator
        priority :highest

        def ts(dir)
            #Read commit time from git log and store in a map
            th = {}
            curt = 0

            `git log --pretty=format:%ct --name-only #{dir}`.each_line do | l |

                if l.strip.end_with?('.yaml') 
                    key = l.pathmap("%n")
                    th[key] = curt if not th.has_key?(key)
                else
                    curt = l.to_i
                end

            end

            th
        end

        def generate(site)

            th = ts(site.config['data_source'])

            site.data.each_pair do | name, cmds | 
                [cmds].flatten.each do | cmd |

                    next if cmd['hide']
                    #Look for playback pack and transform it while recorder & zipfile exists
                    unless cmd['recorder'].nil? || cmd['recorder'] == ''
			puts ''
                        filename = "%s/playback/%s.zip" % [Dir.getwd, name]
			puts "Found playback package '#{filename}'"
                        if File.file?(filename)
			    Zip::ZipFile.open(filename) do |it|
                                type_data = it.read(it.find_entry('script'))
                                timing_data = it.read(it.find_entry('timing'))
				type_processed = "\r\n" + type_data.split(/\n/)[1..-1].join("\n") + "\n\n"
				cursor = 0
				r = [] 
				timing_data.split(/\n/).find_all { |it| it != '' }.each { |it|
					p = it.split(/ /)
					r << (p[0].to_f * 1000).to_i
					r << type_processed[cursor, p[1].to_i]
					cursor += p[1].to_i	
				}
				cmd['playback'] = r.to_json
                            end
                        end
                    end

                    #Set post time and collect the post
                    cmd['date'] = Time.at(th[name]) 
		    cmd['name'] = name
                    site.posts << CommandLinePost.new(site,site.dest, cmd)

                end
            end

            site.posts.sort! { | x, y | th.fetch(y.slug, 0) <=> th.fetch(x.slug, 0) }
        end

    end
end
